import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("cadastro SaaS envia convite de senha sem aprovação manual",()=>{
 const registration=readFileSync("src/lib/saas/signup.ts","utf8");
 const route=readFileSync("src/app/api/solicitacoes/route.ts","utf8");
 assert.match(registration,/queueOwnerInvitation\(tx,tenantId,"SIGNUP"\)/);
 assert.match(registration,/pg_advisory_xact_lock/);
 assert.match(registration,/limite diário/i);
 assert.match(route,/ownerInviteChannelReady\("EMAIL"\)/);
 assert.match(route,/registerTrialRequest/);
 assert.match(route,/originHash/);
});
test("somente e-mail confirmado inicia provisionamento de banco exclusivo",()=>{
 const invitations=readFileSync("src/lib/saas/invitations.ts","utf8");
 const worker=readFileSync("src/lib/saas/provisioning-worker.ts","utf8");
 assert.match(invitations,/owner_email_verified_provisioning_queued/);
 assert.match(invitations,/UPDATE platform_tenants SET state='PROVISIONING'/);
 assert.match(invitations,/ON CONFLICT\(tenant_id\) DO NOTHING/);
 assert.match(worker,/migrateNewTenantDatabase/);
 assert.match(worker,/self_service_trial_started_after_db_ready/);
 assert.match(worker,/trial_ends_at=now\(\)\+INTERVAL '168 hours'/);
 assert.match(worker,/platform_memberships/);
 assert.match(worker,/a.metadata->>'kind'='TESTE_7_DIAS'/);
});
test("painel não exige aprovação manual e senha não libera acesso antes do READY",()=>{
 const production=readFileSync("src/components/saas-production-dashboard.tsx","utf8");
 const qa=readFileSync("src/components/saas-qa-dashboard.tsx","utf8");
 const invite=readFileSync("src/app/convite/page.tsx","utf8");
 assert.doesNotMatch(production,/>Aprovar banco<\/button>/);
 assert.doesNotMatch(qa,/>Aprovar e provisionar<\/button>/);
 assert.match(invite,/provisioning/);
 assert.match(invite,/não começou/);
});
