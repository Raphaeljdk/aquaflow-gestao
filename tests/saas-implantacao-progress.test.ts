import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("solicitações aprovadas navegam para a implantação acompanhada",()=>{
 const dashboard=readFileSync("src/components/platform-dashboard.tsx","utf8");
 assert.match(dashboard,/\/plataforma\/implantacao\?solicitacao=/);
 assert.match(dashboard,/Preparar e acompanhar banco/);
 assert.match(dashboard,/if\(status==="APROVADO"\)setTab\("aprovadas"\)/);
 assert.doesNotMatch(dashboard,/onClick=\{\(\)=>void prepare\(item\)\}/);
});
test("implantação exige aprovação, sessão administrativa e origem válida",()=>{
 const route=readFileSync("src/app/api/plataforma/solicitacoes/[id]/preparar/route.ts","utf8");
 assert.match(route,/await requirePlatformAdmin\(\)/);
 assert.match(route,/checkOrigin\(request\)/);
 assert.match(route,/status!=="APROVADO"/);
 assert.match(route,/processOneProvisioningJob\(tenant\)/);
 assert.match(route,/job_state==="PENDING"/);
 assert.match(route,/state==="ERROR"/);
 assert.match(route,/getCentralProgress/);
 assert.match(route,/Cache-Control/);
});
test("worker mantém lock e limita-se ao tenant autorizado",()=>{
 const worker=readFileSync("src/lib/saas/provisioning-worker.ts","utf8");
 assert.match(worker,/processOneProvisioningJob\(tenantFilter\?:string\)/);
 assert.match(worker,/j.tenant_id=\$\{tenantFilter\?\?null\}::uuid/);
 assert.match(worker,/FOR UPDATE OF j SKIP LOCKED/);
 assert.match(worker,/manual_reconciliation_required/);
});
test("painel mostra progresso de banco e e-mail, sem iniciar pagamentos",()=>{
 const page=readFileSync("src/app/plataforma/implantacao/page.tsx","utf8");
 const ui=readFileSync("src/components/implantacao-progress.tsx","utf8");
 assert.match(page,/requirePlatformAdmin/);
 assert.match(ui,/Banco exclusivo/);
 assert.match(ui,/Convite por e-mail/);
 assert.match(ui,/setInterval/);
 assert.doesNotMatch(ui,/\/api\/stripe\/checkout/);
});