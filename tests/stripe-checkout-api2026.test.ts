import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("Checkout usa parâmetro aceito pela Stripe API 2026 mantendo método explícito",()=>{
 const gateway=readFileSync("src/lib/saas/stripe-gateway.ts","utf8");
 assert.match(gateway,/p\.set\("allowed_payment_method_types\[0\]",info\.method==="PIX"\?"pix":"card"\)/);
 assert.doesNotMatch(gateway,/p\.set\("payment_method_types\[0\]"/);
 assert.match(gateway,/if\(!upFront && info\.method!=="CARD"\)/);
 assert.match(gateway,/if\(upFront && info\.method==="PIX" && !stripePixEnabled\(\)\)/);
 assert.match(gateway,/expectedStripeCheckoutPrefix\(mode\)/);
 assert.match(gateway,/stripeApi<Checkout>\("\/v1\/checkout\/sessions"/);
});
test("Checkout mantém autorização do gestor e recusa duplicidade antes de chamar Stripe",()=>{
 const route=readFileSync("src/app/api/plataforma/saas/pilotos/[id]/checkout/route.ts","utf8");
 assert.match(route,/requirePlatformAdmin\(\)/);
 assert.match(route,/checkOrigin\(request\)/);
 assert.match(route,/r\.state!=="READY"/);
 assert.match(route,/r\.owners<1/);
 assert.match(route,/status='PENDING'/);
 assert.match(route,/UPDATE platform_billing_charges SET status='CANCELED'/);
});
test("Erro Stripe aparece no cartão da empresa sem confundir com falha do Neon",()=>{
 const panel=readFileSync("src/components/platform-central-panel.tsx","utf8");
 assert.match(panel,/const \[checkoutError,setCheckoutError\]/);
 assert.match(panel,/setCheckoutError\(\{tenantId:t\.id,message:/);
 assert.match(panel,/checkoutError\?\.tenantId===t\.id/);
 assert.match(panel,/Não foi possível gerar o link Stripe/);
 assert.match(panel,/busyTenant===t\.id/);
 assert.match(panel,/paymentLink\?\.tenantId===t\.id/);
});
