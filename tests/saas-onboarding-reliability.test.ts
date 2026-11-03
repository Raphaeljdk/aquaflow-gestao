import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(path:string)=>readFileSync(path,"utf8");
test("cadastro público consulta modo real, sem prometer envio quando só há legado",()=>{
 const ui=read("src/app/cadastrar-lava-rapido/page.tsx");
 const status=read("src/app/api/public/cadastro-status/route.ts");
 assert.match(ui,/api\/public\/cadastro-status/);
 assert.match(ui,/successMessage/);
 assert.match(ui,/automatic \? /);
 assert.match(status,/saasPilotMode\(\)/);
 assert.match(status,/ownerInviteChannelReady\("EMAIL"\)/);
 assert.doesNotMatch(status,/RESEND_API_KEY|owner_email|encrypted_database_url/);
});
test("cadastro legado diferencia já cadastrado de excesso de rede",()=>{
 const route=read("src/app/api/solicitacoes/route.ts");
 assert.match(route,/solicitacaoEmpresa\\.findFirst/);
 assert.match(route,/limite >= 10/);
 assert.match(route,/Retry-After/);
});
test("Resend aplica chave idempotente e não expõe falhas do provedor",()=>{
 const invite=read("src/lib/saas/owner-invite-delivery.ts");
 const notice=read("src/lib/saas/notification-providers.ts");
 const dispatcher=read("src/app/api/cron/saas-notifications/route.ts");
 const classifier=read("src/lib/saas/resend-diagnostics.ts");
 assert.match(invite,/Idempotency-Key.*ducha-owner-/);
 assert.match(notice,/Idempotency-Key.*ducha-notice-/);
 assert.match(dispatcher,/notification_send_failed/);
 assert.match(dispatcher,/ResendDeliveryError/);
 assert.match(classifier,/sender_or_permission_restricted/);
 assert.match(classifier,/invalid_api_key/);
 assert.doesNotMatch(dispatcher,/console\.error\(.*row\.recipient/);
});
test("Neon consulta inventário antes de criar projeto e não repete POST ambíguo",()=>{
 const neon=read("src/lib/saas/neon-provisioner.ts");
 const worker=read("src/lib/saas/provisioning-worker.ts");
 assert.ok(neon.indexOf("api/v2/projects?")<neon.indexOf('method:"POST"'));
 assert.match(neon,/neon_project_exists_manual_reconciliation_required/);
 assert.match(neon,/NEON_ORG_ID/);
 assert.match(worker,/manual_reconciliation_required/);
 assert.match(worker,/SKIP LOCKED/);
});
