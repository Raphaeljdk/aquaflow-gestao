import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("projeto Neon individual não é criado pelo navegador e URL é criptografada",()=>{
 const module=readFileSync("src/lib/saas/neon-provisioner.ts","utf8");
 const vault=readFileSync("src/lib/saas/database-secrets.ts","utf8");
 assert.match(module,/NEON_ORG_API_KEY/);
 assert.match(module,/encryptTenantDatabaseUrl/);
 assert.match(module,/não repetir POST/);
 assert.match(vault,/aes-256-gcm/);
 assert.match(vault,/Não é permitido retornar ao banco legado/);
 assert.doesNotMatch(vault,/NEXT_PUBLIC_/);
});
test("vencimento automático exige autorização e deixa bancos operacionais intactos",()=>{
 const scan=readFileSync("src/lib/saas/expiry-job.ts","utf8");
 const endpoint=readFileSync("src/app/api/cron/saas-expiry/route.ts","utf8");
 assert.match(scan,/UPDATE platform_entitlements/);
 assert.match(scan,/e\.state='TRIAL'/);
 assert.match(scan,/platform_notification_outbox/);
 assert.doesNotMatch(scan,/DELETE FROM/);
 assert.match(endpoint,/timingSafeEqual/);
 assert.match(endpoint,/CRON_SECRET/);
});
test("Stripe usa assinatura HMAC, consulta autenticada e conciliação idempotente",()=>{
 const provider=readFileSync("src/lib/saas/stripe-gateway.ts","utf8");
 const reconciler=readFileSync("src/lib/saas/reconciliation.ts","utf8");
 const webhook=readFileSync("src/app/api/stripe/webhook/route.ts","utf8");
 assert.match(provider,/timingSafeEqual/);
 assert.match(provider,/createHmac/);
 assert.match(provider,/STRIPE_BILLING_ENABLED/);
 assert.match(webhook,/loadPaymentIntent/);
 assert.match(webhook,/loadInvoice/);
 assert.match(reconciler,/FOR UPDATE/);
 assert.match(reconciler,/ON CONFLICT\(provider,external_event_id\) DO NOTHING/);
});
test("notificações são agendadas para canais oficiais sem expor token no frontend",()=>{
 const provider=readFileSync("src/lib/saas/notification-providers.ts","utf8");
 const worker=readFileSync("src/app/api/cron/saas-notifications/route.ts","utf8");
 assert.match(provider,/api\.resend\.com\/emails/);
 assert.match(provider,/graph\.facebook\.com/);
 assert.match(provider,/WHATSAPP_TEMPLATE_LICENSE_STATUS/);
 assert.match(worker,/platform_notification_claims/);
 assert.match(worker,/CRON_SECRET/);
 assert.doesNotMatch(worker,/NEXT_PUBLIC_/);
});
test("treinamento oficial e vídeos configurados permanecem disponíveis em Como usar",()=>{
 const help=readFileSync("src/app/(dashboard)/como-usar/page.tsx","utf8");
 // PR #47 manteve o vídeo configurado e acrescentou o tutorial narrado via Descript.
 assert.ok(help.includes("Treinamento operacional Ducha Elitte"));
 assert.ok(help.includes("https://share.descript.com/embed/v3pWHD1uqeQ"));
 assert.ok(help.includes("data?.configuracao.manualVideoUrl"));
 assert.ok(help.includes("youtube-nocookie.com/embed"));
 assert.ok(help.includes("manualPdfUrl"));
});
