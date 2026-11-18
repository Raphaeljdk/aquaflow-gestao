import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=(path:string)=>readFileSync(path,"utf8");

test("link do parceiro abre o cadastro existente no modo teste de 7 dias",()=>{
 const manager=src("src/components/sales-referral-manager.tsx");
 const page=src("src/app/cadastrar-lava-rapido/page.tsx");
 assert.match(manager,/cadastrar-lava-rapido\?modalidade=teste&indicacao=/);
 assert.match(page,/q\.get\("indicacao"\)/);
 assert.match(page,/body:JSON\.stringify\(\{\.\.\.form, indicacao/);
 assert.match(page,/Cadastro por indicação comercial/);
 assert.match(page,/TESTE_7_DIAS/);
});
test("partner code é validado no servidor e não altera teste nem pagamento",()=>{
 const helper=src("src/lib/saas/sales-referrals.ts");
 const signup=src("src/lib/saas/signup.ts");
 const register=src("src/app/api/solicitacoes/route.ts");
 assert.match(helper,/SALES_REFERRAL_PATTERN=\/\^ind-/);
 assert.match(helper,/active=true/);
 assert.match(signup,/const salesPartner=await resolveSalesPartner\(tx,info\.referralCode\)/);
 assert.match(signup,/await assignSalesReferral\(tx,tenantId,salesPartner\)/);
 assert.match(signup,/db\.\$transaction/);
 assert.match(signup,/assertRegistrationIdentityAvailable/);
 assert.match(register,/referralCode:body\.data\.indicacao/);
 assert.match(register,/parceiroIndicador:salesPartner\?\.code/);
 assert.doesNotMatch(helper,/UPDATE platform_entitlements|UPDATE platform_sales_referrals/);
});
test("gestão central mostra responsável por indicação sem expor dados a outros parceiros",()=>{
 const api=src("src/app/api/plataforma/saas/indicadores/route.ts");
 const central=src("src/app/api/plataforma/saas/central/route.ts");
 const manager=src("src/components/sales-referral-manager.tsx");
 const dashboard=src("src/components/platform-dashboard.tsx");
 assert.match(api,/await requirePlatformAdmin\(\)/);
 assert.match(api,/checkOrigin\(request\)/);
 assert.match(api,/randomBytes\(6\)/);
 assert.match(api,/platform_sales_referrals/);
 assert.match(central,/LEFT JOIN platform_sales_referrals sr ON sr\.tenant_id=t\.id/);
 assert.match(central,/salesPartnerName/);
 assert.match(manager,/Copiar link/);
 assert.match(dashboard,/tab==="empresas" && <>\<SalesReferralManager/);
 assert.doesNotMatch(dashboard,/\["indicacoes","/);
});
test("migrações preservam clientes e impedem duplicar atribuição central",()=>{
 const centralMigration=src("architecture/saas/sales-referrals-20261118.sql");
 const legacyMigration=src("prisma/migrations/202611180001_indicacoes_comerciais/migration.sql");
 const build=src("package.json");
 assert.match(centralMigration,/tenant_id UUID PRIMARY KEY/);
 assert.match(centralMigration,/REFERENCES platform_tenants\(id\) ON DELETE RESTRICT/);
 assert.match(legacyMigration,/ADD COLUMN IF NOT EXISTS "parceiroIndicador"/);
 assert.match(build,/prepare-sales-referrals\.mjs/);
 const preparation=src("scripts/prepare-sales-referrals.mjs");
 assert.match(preparation,/VERCEL_ENV==="production"/);
 assert.match(preparation,/a\.hostname===b\.hostname/);
});
