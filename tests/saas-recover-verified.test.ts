import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("recuperação de banco existente nunca cria novo projeto Neon",()=>{
 const route=readFileSync("src/app/api/cron/saas-recover-verified/route.ts","utf8");
 assert.match(route,/timingSafeEqual/);
 assert.match(route,/VERCEL_ENV!=="production"/);
 assert.match(route,/STRIPE_BILLING_ENABLED==="true"/);
 assert.match(route,/expectedHost="ep-young-snow/);
 assert.match(route,/shape\.total!==15/);
 assert.match(route,/shape\.tables!==18/);
 assert.match(route,/current\.state!=="ERROR"/);
 assert.match(route,/current\.job_state!=="ERROR"/);
 assert.match(route,/neon_project_id=\$\{projectId\}/);
 assert.match(route,/queueOwnerInvitation\(tx,tenantId,"TRIAL"\)/);
 assert.doesNotMatch(route,/api\/v2\/projects/);
});
test("provisionamento usa escopo Neon e nunca repete POST com projeto existente",()=>{
 const src=readFileSync("src/lib/saas/neon-provisioner.ts","utf8");
 assert.match(src,/process\.env\.NEON_ORG_ID/);
 assert.match(src,/pagination\?\.next/);
 assert.match(src,/neon_project_exists_manual_reconciliation_required/);
 assert.match(src,/org_id:orgId/);
 assert.match(src,/neon_create_http_/);
 const worker=readFileSync("src/lib/saas/provisioning-worker.ts","utf8");
 assert.match(worker,/last_error=\$\{code\}/);
 assert.match(worker,/manual_reconciliation_required/);
});
test("recuperação temporária tem cron autenticado sem ativar pagamentos",()=>{
 const v=JSON.parse(readFileSync("vercel.json","utf8"));
 assert.ok(v.crons.some((c:{path:string})=>c.path==="/api/cron/saas-recover-verified"));
 const r=readFileSync("src/app/api/cron/saas-recover-verified/route.ts","utf8");
 assert.match(r,/SAAS_PRODUCTION_MODE==="true"/);
 assert.doesNotMatch(r,/stripeApi|createCheckoutSession/);
});
