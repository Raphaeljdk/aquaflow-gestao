import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("etapa de Checkout é validada somente por sessão live persistida no Neon",()=>{
 const central=readFileSync("src/app/api/plataforma/saas/central/route.ts","utf8");
 assert.match(central,/stripe_checkout_session_id LIKE 'cs_live_%'/);
 assert.match(central,/provider='STRIPE'/);
 assert.match(central,/AS "checkoutValidated"/);
 assert.match(central,/checkoutEvidence\[0\]\?\.checkoutValidated===true/);
 assert.match(central,/billingReadiness:\{\.\.\.stripeBillingReadiness\(process\.env\),checkoutValidated\}/);
 assert.match(central,/await requirePlatformAdmin\(\)/);
 assert.doesNotMatch(central,/UPDATE platform_billing_charges|UPDATE platform_entitlements|export async function POST/);
});
test("painel aprova apenas Checkout; mantém liquidação e webhook pendentes",()=>{
 const panel=readFileSync("src/components/platform-central-panel.tsx","utf8");
 assert.match(panel,/data\.billingReadiness\.checkoutValidated\?"Checkout aprovado":"Aguardando homologação"/);
 assert.match(panel,/O pagamento, o webhook de confirmação e a conciliação ainda precisam/);
 assert.match(panel,/Nenhum cliente é marcado como pago nem tem a assinatura ativada sem liquidação comprovada/);
 assert.match(panel,/!data\.billingReadiness\.liveConfigurationReady\?"Não liberado"/);
});
test("nenhuma aprovação de checkout concede acesso ao ERP sem pagamento",()=>{
 const checkout=readFileSync("src/app/api/plataforma/saas/pilotos/[id]/checkout/route.ts","utf8");
 const gateway=readFileSync("src/lib/saas/stripe-gateway.ts","utf8");
 assert.match(checkout,/stripe_checkout_session_id=\$\{checkout\.id\}/);
 assert.doesNotMatch(checkout,/UPDATE platform_entitlements/);
 assert.match(gateway,/expectedStripeCheckoutPrefix\(mode\)/);
});
