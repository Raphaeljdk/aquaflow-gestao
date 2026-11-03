import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p:string)=>readFileSync(p,"utf8");
test("recuperação administrativa preserva bancos e senhas e invalida link antigo",()=>{
 const recovery=read("src/lib/saas/invite-recovery.ts");
 assert.match(recovery,/state!=="READY"/);
 assert.match(recovery,/has_database/);
 assert.match(recovery,/has_owner\|\|t.has_identity/);
 assert.match(recovery,/provider_message_id IS NOT NULL/);
 assert.match(recovery,/outbox\[0\]\?\.state!=="ERROR"/);
 assert.match(recovery,/platform_invitations SET expires_at=now\(\)/);
 assert.match(recovery,/queueOwnerInvitation\(tx,tenantId,"TRIAL"\)/);
 assert.match(recovery,/owner_invite_recovery_requested/);
 assert.doesNotMatch(recovery,/createNeonTenantProject|platform_identities SET|platform_tenants SET/);
});
test("recuperação exige sessão do administrador, origem válida e pedido aprovado",()=>{
 const route=read("src/app/api/plataforma/solicitacoes/[id]/recuperar-convite/route.ts");
 assert.match(route,/requirePlatformAdmin\(\)/);
 assert.match(route,/checkOrigin\(request\)/);
 assert.match(route,/status!=="APROVADO"/);
 assert.match(route,/tenants.length!==1/);
 assert.match(route,/inviteRecoveryMode\(process.env\)/);
 assert.doesNotMatch(route,/approveTrialRequest|processOneProvisioningJob/);
});
test("cron pode reentregar somente convite explicitamente recuperado e sem reprocessar os erros antigos",()=>{
 const cron=read("src/app/api/cron/saas-notifications/route.ts");
 assert.match(cron,/inviteRecoveryMode\(process.env\)/);
 assert.match(cron,/o.state='PENDING'/);
 assert.match(cron,/a.action='owner_invite_recovery_requested'/);
 assert.match(cron,/o.payload->>'reason'='TRIAL'/);
 assert.match(cron,/a.created_at<=o.created_at/);
 assert.match(cron,/platform_notification_claims/);
});
test("tela reflete último envio, não marca erro permanente, e oferece recuperação real",()=>{
 const api=read("src/app/api/plataforma/solicitacoes/[id]/preparar/route.ts");
 const ui=read("src/components/implantacao-progress.tsx");
 assert.match(api,/ORDER BY o.created_at DESC,o.id DESC LIMIT 1/);
 assert.match(api,/invitationFailed:r\?\.invitation_state==="ERROR"/);
 assert.match(api,/canRecover:inviteRecoveryMode/);
 assert.match(ui,/status\?\.canRecover/);
 assert.match(ui,/recuperar-convite/);
 assert.match(ui,/method:"POST"/);
});
