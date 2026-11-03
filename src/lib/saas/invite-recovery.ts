import "server-only";
import type {PrismaClient} from "@prisma/client";
import {BusinessError} from "@/lib/domain";
import {queueOwnerInvitation} from "./secure-owner-invites";

/** Recovery operates independently of the SaaS cutover; legacy logins stay on the old DB. */
export function inviteRecoveryMode(env:Record<string,string|undefined>){
 return env.VERCEL_ENV==="production"
   && env.SAAS_INVITE_RECOVERY_ENABLED==="true"
   && env.SAAS_PRODUCTION_MODE!=="true"
   && env.SAAS_QA_MODE!=="true";
}

/** One new, unique invitation after a failed send; never replay a claimed outbox row. */
export async function recoverFailedOwnerInvite(db:PrismaClient,tenantId:string){
 if(!/^[a-f0-9-]{36}$/i.test(tenantId))throw new BusinessError("Empresa inválida.",400);
 return db.$transaction(async tx=>{
  const rows=await tx.$queryRaw<Array<{state:string;has_database:boolean;has_owner:boolean;has_identity:boolean;trial:boolean}>>`
   SELECT t.state,(t.neon_project_id IS NOT NULL AND t.encrypted_database_url IS NOT NULL) AS has_database,
     EXISTS(SELECT 1 FROM platform_memberships m
       WHERE m.tenant_id=t.id AND m.role='OWNER' AND m.enabled) AS has_owner,
     EXISTS(SELECT 1 FROM platform_identities i WHERE lower(i.email)=lower(t.owner_email)) AS has_identity,
     EXISTS(SELECT 1 FROM platform_audit_events a WHERE a.tenant_id=t.id
       AND (a.action='qa_trial_requested' OR
            (a.action='saas_signup_requested' AND a.metadata->>'kind'='TESTE_7_DIAS'))) AS trial
   FROM platform_tenants t WHERE t.id=${tenantId}::uuid FOR UPDATE OF t`;
  const t=rows[0];
  if(!t||t.state!=="READY"||!t.has_database||!t.trial)
   throw new BusinessError("A recuperação exige banco exclusivo pronto e teste autorizado.",409);
  if(t.has_owner||t.has_identity)
   throw new BusinessError("O proprietário já possui identidade; não alterar sua senha.",409);
  const outbox=await tx.$queryRaw<Array<{state:string;confirmed:boolean}>>`
    SELECT o.state, (c.provider_message_id IS NOT NULL) AS confirmed
    FROM platform_notification_outbox o
      LEFT JOIN platform_notification_claims c ON c.outbox_id=o.id
    WHERE o.tenant_id=${tenantId}::uuid AND o.template_key='owner_invite'
    ORDER BY o.created_at DESC LIMIT 1`;
  if(outbox[0]?.state!=="ERROR"||outbox[0]?.confirmed)
   throw new BusinessError("Convite já enviado, pendente ou com resultado incerto. Revisão necessária.",409);
  const oldProviderAck=await tx.$queryRaw<Array<{count:number}>>`
    SELECT count(*)::integer AS count
    FROM platform_notification_outbox o
      JOIN platform_notification_claims c ON c.outbox_id=o.id
    WHERE o.tenant_id=${tenantId}::uuid AND o.template_key='owner_invite'
      AND c.provider_message_id IS NOT NULL`;
  if((oldProviderAck[0]?.count??0)>0)
   throw new BusinessError("Há confirmação anterior do provedor. Não repetir o convite.",409);
  const recent=await tx.$queryRaw<Array<{count:number}>>`
    SELECT count(*)::integer AS count FROM platform_invitations
    WHERE tenant_id=${tenantId}::uuid AND created_at>now()-INTERVAL '24 hours'`;
  if((recent[0]?.count??0)>=3)
   throw new BusinessError("Limite de recuperação atingido. Consulte o suporte.",429);
  // An old link is invalidated first, avoiding two usable password-creation links.
  await tx.$executeRaw`UPDATE platform_invitations SET expires_at=now()
    WHERE tenant_id=${tenantId}::uuid AND used_at IS NULL AND expires_at>now()`;
  const queued=await queueOwnerInvitation(tx,tenantId,"TRIAL");
  if(!queued.queued)throw new BusinessError("Convite já existente; recuperação não executada.",409);
  await tx.$executeRaw`INSERT INTO platform_audit_events(tenant_id,action,metadata)
    VALUES(${tenantId}::uuid,'owner_invite_recovery_requested','{"source":"admin","reason":"failed_unconfirmed_delivery"}'::jsonb)`;
  return {queued:true};
 });
}
