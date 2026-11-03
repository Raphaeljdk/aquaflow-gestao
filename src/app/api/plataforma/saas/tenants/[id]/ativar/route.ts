import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {requirePlatformAdmin} from "@/lib/platform-admin";
import {checkOrigin,apiError} from "@/lib/api";
import {BusinessError} from "@/lib/domain";
import {withControlPlane} from "@/lib/saas/control-plane";
import {adminOnboardingMode} from "@/lib/saas/admin-onboarding-mode";
import {queueOwnerInvitation} from "@/lib/saas/secure-owner-invites";
import {deliverOwnerInvite} from "@/lib/saas/owner-invite-delivery";
import {processOneProvisioningJob} from "@/lib/saas/provisioning-worker";
import {ResendDeliveryError} from "@/lib/saas/resend-diagnostics";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Explicit admin action for a previously approved tenant; no public signup flag needed. */
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  await requirePlatformAdmin();
  checkOrigin(request);
  if(!adminOnboardingMode(process.env))
   throw new BusinessError("Ativação administrativa desabilitada neste ambiente.",503);
  const {id}=await params;
  if(!idPattern.test(id))throw new BusinessError("Empresa inválida.",400);
  if(Number(request.headers.get("content-length")??0)>256)throw new BusinessError("Requisição inválida.",413);
  const input=z.object({action:z.enum(["send-invite","prepare-db"])}).parse(await request.json());
  if(input.action==="send-invite"){
   const notice=await withControlPlane(db=>db.$transaction(async tx=>{
    const rows=await tx.$queryRaw<Array<{eligible:boolean;identity_exists:boolean}>>`
      SELECT
       (t.state='PROVISIONING' AND t.neon_project_id IS NULL
        AND t.encrypted_database_url IS NULL AND e.state='PENDING'
        AND EXISTS(SELECT 1 FROM platform_provisioning_jobs j WHERE j.tenant_id=t.id
          AND j.state='PENDING' AND j.attempts=0)
        AND EXISTS(SELECT 1 FROM platform_audit_events a WHERE a.tenant_id=t.id
          AND a.action='qa_provisioning_approved')
        AND EXISTS(SELECT 1 FROM platform_audit_events a WHERE a.tenant_id=t.id
          AND a.action='saas_signup_requested')
        AND NOT EXISTS(SELECT 1 FROM platform_memberships m
          WHERE m.tenant_id=t.id AND m.enabled AND m.role='OWNER')) AS eligible,
       EXISTS(SELECT 1 FROM platform_identities i
         WHERE lower(i.email)=lower(t.owner_email)) AS identity_exists
      FROM platform_tenants t JOIN platform_entitlements e ON e.tenant_id=t.id
      WHERE t.id=${id}::uuid FOR UPDATE OF t`;
    if(!rows[0]?.eligible || rows[0].identity_exists)
     throw new BusinessError("Cadastro já ativado ou incompatível com recuperação automática.",409);
    await queueOwnerInvitation(tx,id,"SIGNUP");
    const queued=await tx.$queryRaw<Array<{id:string;recipient:string;payload:{encryptedUrl:string;reason:string};state:string}>>`
      SELECT o.id::text,o.recipient,o.payload,o.state
      FROM platform_notification_outbox o
      WHERE o.tenant_id=${id}::uuid AND o.channel='EMAIL'
        AND o.template_key='owner_invite' AND o.payload->>'reason'='SIGNUP'
      ORDER BY o.created_at DESC,o.id DESC LIMIT 1`;
    if(queued[0]?.state!=="PENDING")
     throw new BusinessError("Convite anterior enviado ou com resultado incerto; não duplicar.",409);
    return queued[0];
   }));
   const provider=await withControlPlane(async db=>{
    const claim=await db.$queryRaw<Array<{id:string}>>`
      INSERT INTO platform_notification_claims(outbox_id)
      VALUES(${notice.id}::uuid) ON CONFLICT(outbox_id) DO NOTHING
      RETURNING outbox_id::text AS id`;
    if(!claim[0])throw new BusinessError("Envio já iniciado. Verifique o histórico de e-mails.",409);
    try{
      const providerId=await deliverOwnerInvite({id:notice.id,channel:"EMAIL",recipient:notice.recipient,payload:notice.payload});
      await db.$transaction([
       db.$executeRaw`UPDATE platform_notification_claims SET provider_message_id=${providerId}
         WHERE outbox_id=${notice.id}::uuid`,
       db.$executeRaw`UPDATE platform_notification_outbox
         SET state='SENT',delivered_at=now(),attempts=attempts+1 WHERE id=${notice.id}::uuid`
      ]);
      return true;
    }catch(error){
      const category=error instanceof ResendDeliveryError?error.category:"unknown_outcome";
      const httpStatus=error instanceof ResendDeliveryError?error.httpStatus:null;
      await db.$transaction([
       db.$executeRaw`UPDATE platform_notification_outbox
        SET state='ERROR',attempts=attempts+1 WHERE id=${notice.id}::uuid`,
       db.$executeRaw`INSERT INTO platform_audit_events(tenant_id,action,metadata)
        VALUES(${id}::uuid,'notification_send_failed',${JSON.stringify({category,httpStatus})}::jsonb)`
      ]);
      throw new BusinessError("Convite não confirmado pelo Resend. Verifique o histórico antes de tentar novamente.",503);
    }
   });
   return NextResponse.json({sent:provider,detail:"Convite encaminhado ao Resend. Confirme o recebimento antes de preparar o banco."},
     {headers:{"Cache-Control":"private,no-store"}});
  }

  // Never create a Neon project before the owner's email was explicitly verified.
  const eligible=await withControlPlane(db=>db.$queryRaw<Array<{ok:boolean}>>`
    SELECT
      (t.state='PROVISIONING' AND t.neon_project_id IS NULL
       AND t.encrypted_database_url IS NULL AND e.state='PENDING'
       AND EXISTS(SELECT 1 FROM platform_provisioning_jobs j WHERE j.tenant_id=t.id
         AND j.state='PENDING' AND j.attempts=0)
       AND EXISTS(SELECT 1 FROM platform_audit_events a WHERE a.tenant_id=t.id
         AND a.action='qa_provisioning_approved')
       AND EXISTS(SELECT 1 FROM platform_audit_events a WHERE a.tenant_id=t.id
         AND a.action='owner_email_verified_provisioning_queued')
       AND EXISTS(SELECT 1 FROM platform_memberships m JOIN platform_identities i
         ON m.identity_id=i.id WHERE m.tenant_id=t.id AND m.role='OWNER' AND m.enabled AND i.enabled)
      ) AS ok
    FROM platform_tenants t JOIN platform_entitlements e ON e.tenant_id=t.id
    WHERE t.id=${id}::uuid`);
  if(!eligible[0]?.ok)
    throw new BusinessError("Confirmação de e-mail, aprovação ou fila Neon ainda pendente.",409);
  const result=await processOneProvisioningJob(id);
  if(!result.processed)throw new BusinessError("Implantação já iniciada ou não elegível para repetição.",409);
  if(!("ready" in result) || !result.ready)
    throw new BusinessError("Implantação exige revisão técnica; não repita a criação do banco.",409);
  return NextResponse.json({ready:true,detail:"Banco exclusivo preparado e validado. Acesso depende de licença vigente."},
    {headers:{"Cache-Control":"private,no-store"}});
 }catch(error){return apiError(error);}
}
