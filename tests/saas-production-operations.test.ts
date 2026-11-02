import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("operações SaaS são restritas a gestor e modo correto",()=>{
 const control=readFileSync("src/lib/saas/pilot-control.ts","utf8");
 assert.match(control,/assertSaasManagementEnabled/);
 assert.match(control,/SAAS_PRODUCTION_MODE/);
 for(const p of ["checkout","aprovar","convidar","ativar-teste"]){
  const route=readFileSync("src/app/api/plataforma/saas/pilotos/[id]/"+p+"/route.ts","utf8");
  assert.match(route,/requirePlatformAdmin/);
  assert.match(route,/assertSaasManagementEnabled/);
  assert.match(route,/checkOrigin/);
 }
 const checkout=readFileSync("src/app/api/plataforma/saas/pilotos/[id]/checkout/route.ts","utf8");
 assert.match(checkout,/Aguardando ativação e proprietário validado/);
 assert.match(checkout,/status='PENDING'/);
});
test("tela de produção só emite link quando licença e proprietário estiverem validados",()=>{
 const src=readFileSync("src/components/saas-production-dashboard.tsx","utf8");
 assert.match(src,/Cobrar R\$ 80\/mês/);
 assert.match(src,/Cobrar R\$ 790/);
 assert.match(src,/window.confirm/);
 assert.match(src,/t.usuariosAtivos<1/);
});
