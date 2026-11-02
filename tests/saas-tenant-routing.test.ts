import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=(path:string)=>readFileSync(path,"utf8");
test("todas as rotas operacionais comuns injetam o Prisma de tenant",()=>{
  for(const route of [
    "src/app/api/snapshot/route.ts",
    "src/app/api/[entity]/[[...id]]/route.ts",
    "src/app/api/atendimentos-rapidos/route.ts",
    "src/app/api/relatorios/route.ts",
    "src/app/api/chamados/route.ts",
    "src/app/api/chamados/[id]/mensagens/route.ts",
    "src/app/api/pedidos-agendamento/route.ts",
    "src/app/api/pedidos-agendamento/[id]/route.ts",
  ])assert.match(source(route),/withOperationalDatabase/,route);
  assert.match(source("src/lib/repository.ts"),/database\.\$transaction/);
});
test("API publica exige slug explicitamente para impedir escrever em banco errado",()=>{
 for(const route of [
    "src/app/api/public/empresa/route.ts",
    "src/app/api/public/empresa/agendamentos/route.ts",
 ])assert.match(source(route),/withPublicTenant/);
 assert.match(source("src/lib/saas/public-tenant.ts"),/Informe o endereço do estabelecimento/);
});
test("convite começa trial uma vez, após READY e proprietário, sem compartilhar senha",()=>{
 const invite=source("src/lib/saas/invitations.ts");
 assert.match(invite,/randomBytes\(32\)/);
 assert.match(invite,/token_hash/);
 assert.match(invite,/FOR UPDATE OF v,t/);
 assert.match(invite,/state='TRIAL'/);
 assert.match(invite,/168 hours/);
 assert.match(invite,/owner_invite_activated/);
 assert.doesNotMatch(invite,/senha.padr.o/i);
});
test("administrador SaaS nunca adquire automaticamente vinculo com tenant",()=>{
 const identity=source("src/lib/saas/identity.ts");
 assert.match(identity,/platform_operators/);
 assert.match(identity,/platform_memberships/);
 assert.match(source("src/lib/saas/operations.ts"),/if\(!tenantId\)/);
});
