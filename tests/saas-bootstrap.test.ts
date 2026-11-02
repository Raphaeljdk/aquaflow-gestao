import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("bootstrap só funciona uma vez, via admin legado autenticado e senha forte",()=>{
 const src=readFileSync("src/app/api/plataforma/saas/bootstrap/route.ts","utf8");
 assert.match(src,/requirePlatformAdmin/);
 assert.match(src,/checkOrigin/);
 assert.match(src,/SAAS_PRODUCTION_MODE==="true"/);
 assert.match(src,/platform_operators/);
 assert.match(src,/pg_advisory_xact_lock/);
 assert.match(src,/count\(\*\)::int/);
 assert.match(src,/await hash\(password,12\)/);
 assert.doesNotMatch(src,/password\s*=\s*["\x27][^"\x27]+["\x27]/);
});
