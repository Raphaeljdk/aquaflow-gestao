import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p:string)=>readFileSync(p,"utf8");
test("usuários ainda sem senha aparecem no painel sem criar identidades",()=>{
 const route=read("src/app/api/plataforma/saas/central/route.ts");
 assert.match(route,/PENDING_OWNER/);
 assert.match(route,/FROM platform_tenants t LEFT JOIN platform_entitlements/);
 assert.match(route,/WHERE NOT EXISTS\(SELECT 1 FROM platform_memberships/);
 assert.match(route,/t.owner_email AS email/);
 assert.doesNotMatch(route,/INSERT INTO platform_identities|UPDATE platform_identities/);
});
test("status de acesso depende da licença e prontidão do estabelecimento, não somente da identidade ativa",()=>{
 const ui=read("src/components/platform-central-panel.tsx");
 assert.match(ui,/Aguardando ativação/);
 assert.match(ui,/Proprietário pendente/);
 assert.match(ui,/a.tenantState==="READY"/);
 assert.match(ui,/\["TRIAL","ACTIVE","GRACE"\]/);
 assert.match(ui,/Ambiente ou licença pendente/);
});
