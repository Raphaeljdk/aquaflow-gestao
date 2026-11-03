import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("painel administrativo QA usa dados centrais e não legados",()=>{
 const page=readFileSync("src/app/plataforma/page.tsx","utf8");
 const dashboard=readFileSync("src/components/saas-qa-dashboard.tsx","utf8");
 assert.match(page,/SaasQaDashboard/);
 assert.match(page,/SAAS_QA_MODE/);
 assert.match(dashboard,/api\/plataforma\/saas\/pilotos/);
 assert.match(dashboard,/Recuperar convite \(suporte\)/);
 assert.doesNotMatch(dashboard,/Aprovar e provisionar/);
 assert.match(dashboard,/worker prepara um banco Neon exclusivo/);
});
