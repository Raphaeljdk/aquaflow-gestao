import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("diagnóstico migração é somente leitura e exige administrador",()=>{
 const src=readFileSync("src/app/api/plataforma/saas/migracao/diagnostico/route.ts","utf8");
 assert.match(src,/requirePlatformAdmin/);
 assert.match(src,/SAAS_PRODUCTION_MODE/);
 assert.match(src,/WITH|SELECT/);
 assert.match(src,/FROM "User"/);
 assert.match(src,/FROM "Comanda"/);
 assert.match(src,/platform_operators/);
 assert.match(src,/migrationsApplied:false/);
 assert.match(src,/billingReleaseAllowed:false/);
 assert.doesNotMatch(src,/\bDELETE\b|\bTRUNCATE\b|\bDROP\b|\bUPDATE\b/i);
});
