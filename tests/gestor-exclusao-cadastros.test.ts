import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(path:string)=>readFileSync(path,"utf8");
const companies=read("src/components/platform-central-panel.tsx");
const central=read("src/app/api/plataforma/saas/tenants/[id]/excluir/route.ts");
const signup=read("src/app/api/plataforma/solicitacoes/[id]/route.ts");
const dashboard=read("src/components/platform-dashboard.tsx");
const inventory=read("src/app/api/plataforma/saas/central/route.ts");

test("gestor mostra exclusão na ficha da empresa e nos acessos pendentes",()=>{
 assert.match(companies,/Excluir cadastro/);
 assert.match(companies,/onClick=\{\(\)=>void excluirCadastro\(t\)\}/);
 assert.match(companies,/a.source==="PENDING"/);
 assert.match(companies,/a.tenantSlug/);
 assert.match(companies,/window.prompt/);
 assert.match(companies,/window.confirm/);
 assert.match(inventory,/t.slug AS "tenantSlug"/);
 assert.match(dashboard,/Excluir cadastro/);
});

test("rota de remoção SaaS exige gestor, origem, código e confirmação",()=>{
 assert.match(central,/await requirePlatformAdmin\(\)/);
 assert.match(central,/checkOrigin\(request\)/);
 assert.match(central,/z.literal\("EXCLUIR CADASTRO"\)/);
 assert.match(central,/if\(t.slug!==input.slug\)/);
 assert.match(central,/withControlPlane\(db=>db.\$transaction/);
 assert.match(central,/FOR UPDATE OF t,e/);
});

test("recusa excluir qualquer empresa com banco, identidades, teste, licenças ou cobrança",()=>{
 for(const check of ["t.has_db","t.members>0","t.identity_exists","t.charges>0",
  "t.checkout_tokens>0","t.used_invitations>0","t.has_trial","t.unsafe_jobs>0",
  't.license!=="PENDING"'])
  assert.ok(central.includes(check),check);
 assert.match(central,/DELETE FROM platform_invitations/);
 assert.match(central,/DELETE FROM platform_entitlements/);
 assert.match(central,/DELETE FROM platform_tenants/);
 assert.doesNotMatch(central,/DROP TABLE|DELETE FROM "Comanda"|DELETE FROM "User"|neon\.projects\.delete/);
 assert.match(central,/tenant_unprovisioned_registration_deleted/);
});

test("exclusão de solicitação legada restringe a testes não aprovados",()=>{
 assert.match(signup,/export async function DELETE/);
 assert.match(signup,/await requirePlatformAdmin\(\)/);
 assert.match(signup,/checkOrigin\(req\)/);
 assert.match(signup,/existing.email.toLowerCase\(\) !== input.email.toLowerCase\(\)/);
 assert.match(signup,/existing.modalidadeCadastro !== "TESTE_7_DIAS"/);
 assert.match(signup,/\["PENDENTE", "REJEITADO"\]/);
 assert.match(signup,/existing.testeIniciadoEm \|\| existing.testeExpiraEm/);
 assert.match(signup,/solicitacaoEmpresa.deleteMany/);
});
