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
 assert.match(checkout,/Aguardando banco individual e proprietário confirmado/);
 assert.match(checkout,/r.owners<1/);
 assert.match(checkout,/status='PENDING'/);
});
test("checkout em produção só é oferecido depois de confirmar o proprietário",()=>{
 const src=readFileSync("src/components/saas-production-dashboard.tsx","utf8");
 assert.match(src,/Mensal R\$ 80/);
 assert.match(src,/Cobrar R\$ 790/);
 assert.match(src,/window.confirm/);
 assert.match(src,/t.proprietarioAtivo/);
 assert.match(src,/ANUAL_MENSAL/);
});

test("checkout de produção aceita somente domínio verificado sem prefixos permissivos",()=>{
 const src=readFileSync("src/app/api/plataforma/saas/pilotos/[id]/checkout/route.ts","utf8");
 assert.match(src,/https:\/\/www\.duchaelitte\.com\.br/);
 assert.match(src,/\["https:\/\/duchaelitte\.com\.br","https:\/\/www\.duchaelitte\.com\.br"\]/);
 assert.doesNotMatch(src,/startsWith\("https:\/\/duchaelitte\.com\.br"\)/);
});
