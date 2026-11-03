import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("vínculo da cópia exige flags seguras e comparação de integridade",()=>{
 const src=readFileSync("src/lib/saas/legacy-copy-link.ts","utf8");
 assert.match(src,/LEGACY_MIGRATION_LINK_ENABLED/);
 assert.match(src,/SAAS_PRODUCTION_MODE/);
 assert.match(src,/STRIPE_BILLING_ENABLED/);
 assert.match(src,/fingerprints\(origin\)/);
 assert.match(src,/fingerprints\(copy\)/);
 assert.match(src,/new Set\(\[destUrl.hostname,sourceUrl.hostname,controlUrl.hostname\]\).size!==3/);
 assert.match(src,/platformEmail=operatorAccounts\[0\].email/);
 assert.match(src,/current.length>1/);
 assert.match(src,/encrypted_database_url IS NULL/);
 assert.match(src,/PROVISIONING/);
 assert.match(src,/encryptTenantDatabaseUrl/);
 assert.match(src,/tenantId,usersStaged:members.length,cutover:false/);
 assert.match(src,/platform_operators/);
 assert.match(src,/platform_memberships/);
 assert.match(src,/platform_entitlements/);
 assert.match(src,/state\)VALUES\(\$\{tenantId\}::uuid,'PENDING'/);
});
test("cron do vínculo nunca aceita solicitação sem segredo",()=>{
 const src=readFileSync("src/app/api/cron/saas-legacy-link/route.ts","utf8");
 assert.match(src,/timingSafeEqual/);
 assert.match(src,/LEGACY_MIGRATION_LINK_ENABLED/);
 const json=JSON.parse(readFileSync("vercel.json","utf8"));
 assert.ok(json.crons.some((c:{path:string})=>c.path==="/api/cron/saas-legacy-link"));
});
