import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("preflight Resend é autenticado, somente leitura e não reenvia convite",()=>{
 const r=readFileSync("src/app/api/cron/saas-resend-preflight/route.ts","utf8");
 assert.match(r,/timingSafeEqual/);
 assert.match(r,/VERCEL_ENV!=="production"/);
 assert.match(r,/fetch\("https:\/\/api\.resend\.com\/domains"/);
 assert.match(r,/resend_domain_preflight/);
 assert.doesNotMatch(r,/api\.resend\.com\/emails|method:"POST"/);
 assert.doesNotMatch(r,/encryptedUrl|token_hash|platform_notification_outbox/);
});
