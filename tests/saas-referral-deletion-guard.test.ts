import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("a exclusão remove referência comercial somente após garantir ausência de operações",()=>{
 const route=readFileSync("src/app/api/plataforma/saas/tenants/[id]/excluir/route.ts","utf8");
 const check=route.indexOf('if(t.has_db||t.members>0');
 const referral=route.indexOf('DELETE FROM platform_sales_referrals WHERE tenant_id=');
 const tenant=route.indexOf('DELETE FROM platform_tenants WHERE id=');
 assert.ok(check>0 && referral>check && tenant>referral);
 assert.match(route,/requirePlatformAdmin\(\)/);
 assert.match(route,/checkOrigin\(request\)/);
 assert.match(route,/UPDATE platform_audit_events SET tenant_id=NULL/);
 assert.match(route,/db\.\$transaction/);
});
