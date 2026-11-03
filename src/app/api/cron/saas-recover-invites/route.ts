import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {withControlPlane} from "@/lib/saas/control-plane";
import {inviteRecoveryMode,recoverFailedOwnerInvite} from "@/lib/saas/invite-recovery";
export const runtime="nodejs";
export const dynamic="force-dynamic";
/**
 * One-shot self-healing for pre-existing failed invitations with unknown result.
 * A recovery audit event ensures that each tenant is attempted at most once
 * automatically; no Neon projects, logins or billings are modified.
 */
export async function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET;
 const token=req.headers.get("authorization")?.replace(/^Bearer /,"")??"";
 if(!secret||!token||Buffer.byteLength(secret)!==Buffer.byteLength(token)||
   !timingSafeEqual(Buffer.from(secret),Buffer.from(token)))
  return NextResponse.json({error:"Não autorizado."},{status:401});
 if(!inviteRecoveryMode(process.env))
  return NextResponse.json({processed:false,disabled:true},{status:503});
 try{
  const result=await withControlPlane(async db=>{
   const rows=await db.$queryRaw<Array<{id:string}>>`
     SELECT t.id::text
     FROM platform_tenants t
     JOIN platform_entitlements e ON e.tenant_id=t.id
     WHERE t.state='READY' AND e.state='PENDING'
       AND t.neon_project_id IS NOT NULL AND t.encrypted_database_url IS NOT NULL
       AND EXISTS(SELECT 1 FROM platform_provisioning_jobs j
         WHERE j.tenant_id=t.id AND j.state='DONE')
       AND NOT EXISTS(SELECT 1 FROM platform_memberships m
         WHERE m.tenant_id=t.id AND m.role='OWNER' AND m.enabled)
       AND NOT EXISTS(SELECT 1 FROM platform_identities i
         WHERE lower(i.email)=lower(t.owner_email))
       AND EXISTS(SELECT 1 FROM platform_audit_events a
         WHERE a.tenant_id=t.id
         AND (a.action='qa_trial_requested' OR
              (a.action='saas_signup_requested' AND a.metadata->>'kind'='TESTE_7_DIAS')))
       AND NOT EXISTS(SELECT 1 FROM platform_audit_events a
         WHERE a.tenant_id=t.id AND a.action='owner_invite_recovery_requested')
       AND (SELECT o.state FROM platform_notification_outbox o
           WHERE o.tenant_id=t.id AND o.template_key='owner_invite'
           ORDER BY o.created_at DESC LIMIT 1)='ERROR'
       AND NOT EXISTS(SELECT 1 FROM platform_notification_outbox o
         JOIN platform_notification_claims c ON c.outbox_id=o.id
         WHERE o.tenant_id=t.id AND o.template_key='owner_invite'
           AND c.provider_message_id IS NOT NULL)
     ORDER BY t.created_at ASC LIMIT 2`;
   let queued=0,skipped=0;
   for(const item of rows){
    try{const res=await recoverFailedOwnerInvite(db,item.id);if(res.queued)queued++;}
    catch{skipped++;}
   }
   return {candidates:rows.length,queued,skipped};
  });
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch{
  return NextResponse.json({error:"Recuperação indisponível; revisar controle central."},{status:503});
 }
}
