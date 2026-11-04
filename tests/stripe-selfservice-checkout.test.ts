import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {checkoutEntitlementEligible,checkoutAllowedOrigin,validCheckoutCombination} from "../src/lib/saas/checkout-policy";
import {resolveStripeMode} from "../src/lib/saas/stripe-mode";
const src=(path:string)=>readFileSync(path,"utf8");
const now=new Date("2026-11-04T20:00:00.000Z");

test("somente licença sem período pago vigente pode iniciar checkout",()=>{
 assert.equal(checkoutEntitlementEligible("TRIAL",null,now),true);
 assert.equal(checkoutEntitlementEligible("EXPIRED",null,now),true);
 assert.equal(checkoutEntitlementEligible("PENDING",null,now),true);
 assert.equal(checkoutEntitlementEligible("ACTIVE",new Date(now.getTime()-1),now),true);
 assert.equal(checkoutEntitlementEligible("ACTIVE",new Date(now.getTime()+1000),now),false);
 assert.equal(checkoutEntitlementEligible("SUSPENDED",null,now),false);
 assert.equal(checkoutEntitlementEligible("INVALID",null,now),false);
});
test("planos válidos: mensal cartão, 12 mensalidades cartão, anual à vista cartão ou Pix",()=>{
 for(const plan of ["MENSAL","ANUAL_MENSAL","ANUAL_AVISTA"])
  assert.equal(validCheckoutCombination(plan,"CARD"),true);
 assert.equal(validCheckoutCombination("ANUAL_AVISTA","PIX"),true);
 assert.equal(validCheckoutCombination("ANUAL_MENSAL","PIX"),false);
 assert.equal(validCheckoutCombination("MENSAL","PIX"),false);
 assert.equal(validCheckoutCombination("FALSO","CARD"),false);
});
test("origem pública é oficial; prévia só permite checkout QA em domínio Vercel",()=>{
 assert.equal(checkoutAllowedOrigin("https://www.duchaelitte.com.br",{}),true);
 assert.equal(checkoutAllowedOrigin("https://duchaelitte.com.br",{}),true);
 assert.equal(checkoutAllowedOrigin("https://attacker.example",{}),false);
 assert.equal(checkoutAllowedOrigin("https://qa.vercel.app",{SAAS_QA_MODE:"true",VERCEL_ENV:"preview"}),true);
 assert.equal(checkoutAllowedOrigin("https://qa.vercel.app",{SAAS_QA_MODE:"false",VERCEL_ENV:"preview"}),false);
 assert.equal(checkoutAllowedOrigin("http://qa.vercel.app",{SAAS_QA_MODE:"true",VERCEL_ENV:"preview"}),false);
 assert.equal(checkoutAllowedOrigin("https://qa.vercel.app.attacker.test",{SAAS_QA_MODE:"true",VERCEL_ENV:"preview"}),false);
});
test("sem habilitação explícita, Stripe não executa transações mesmo com chaves live",()=>{
 const env={VERCEL_ENV:"production",STRIPE_SECRET_KEY:"sk_live_placeholder",
  STRIPE_WEBHOOK_SECRET:"whsec_placeholder",CONTROL_DATABASE_URL:"postgresql://placeholder"};
 assert.equal(resolveStripeMode({...env,STRIPE_BILLING_ENABLED:"false"}),null);
 assert.throws(()=>resolveStripeMode({...env,STRIPE_BILLING_ENABLED:"true"}),/ambiente inconsistente/);
 assert.equal(resolveStripeMode({...env,STRIPE_BILLING_ENABLED:"true",SAAS_PRODUCTION_MODE:"true"}),"live");
});
test("link de acesso é aleatório, único, expirável e só enviado ao OWNER verificado",()=>{
 const s=src("src/lib/saas/self-service-checkout.ts");
 const ddl=src("architecture/saas/stripe-selfservice-20261104.sql");
 assert.match(s,/randomBytes\(32\)\.toString\("base64url"\)/);
 assert.match(s,/token_hash/);
 assert.match(s,/tokenHash=digest\(token\)/);
 assert.match(s,/now\(\)\+INTERVAL '20 minutes'/);
 assert.match(s,/m\.role='OWNER'/);
 assert.match(s,/lower\(i\.email\)=\$\{email\}/);
 assert.match(s,/email_count/);
 assert.match(s,/requester_hash/);
 assert.match(s,/pg_advisory_xact_lock/);
 assert.match(s,/Se existir um estabelecimento elegível/);
 assert.match(ddl,/token_hash TEXT PRIMARY KEY/);
 assert.match(ddl,/CHECK\(state IN \('PENDING','USED'\)\)/);
 assert.doesNotMatch(s,/console\.log\(token/);
});
test("token não autoriza checkout em outra empresa e é consumido sob lock transacional",()=>{
 const s=src("src/lib/saas/self-service-checkout.ts");
 assert.match(s,/WHERE l\.token_hash=\$\{hash\} AND l\.state='PENDING' AND l\.expires_at>now\(\)/);
 assert.match(s,/FOR UPDATE OF l,t,e/);
 assert.match(s,/owner_verified/);
 assert.match(s,/t\.state AS tenant_state/);
 assert.match(s,/stripe:"\+r\.tenant_id/);
 assert.match(s,/status='PENDING'/);
 assert.match(s,/created_at>now\(\)-INTERVAL '45 minutes'/);
 assert.match(s,/checkoutEntitlementEligible\(r\.license_state,r\.paid_through\)/);
 assert.match(s,/input\.method==="PIX"&&!stripePixEnabled/);
 assert.match(s,/UPDATE platform_checkout_access_tokens SET state='USED'/);
 assert.match(s,/createStripeCheckout/);
 assert.match(s,/stripe_checkout_session_id/);
 assert.doesNotMatch(s,/req\.body\.tenantId|input\.tenantId/);
});
test("rotas de compra nunca confiam no tenant escolhido pelo navegador",()=>{
 const request=src("src/app/api/assinatura/solicitar-link/route.ts");
 const checkout=src("src/app/api/assinatura/checkout/route.ts");
 assert.match(request,/checkOrigin\(request\)/);
 assert.match(checkout,/checkOrigin\(request\)/);
 assert.match(request,/z\.object\(\{email:/);
 assert.match(checkout,/token:z\.string\(\)/);
 assert.match(checkout,/method:z\.enum/);
 assert.doesNotMatch(checkout,/tenantId:z\.string/);
 assert.match(checkout,/Referrer-Policy":"no-referrer/);
});
test("Pix assíncrono não gera licença paga antes da liquidação confirmada",()=>{
 const webhook=src("src/app/api/stripe/webhook/route.ts");
 assert.match(webhook,/if\(session\.payment_status==="unpaid"\)return \{status:"AWAITING_ASYNC_PAYMENT"\}/);
 assert.match(webhook,/checkout\.session\.async_payment_succeeded/);
 assert.match(webhook,/checkout\.session\.async_payment_failed/);
 assert.match(webhook,/await loadPaymentIntent\(session\.payment_intent\)/);
 assert.match(webhook,/payment\.status!=="succeeded"/);
 assert.match(webhook,/recordVerifiedSettlement/);
});
test("assinatura recorrente não cancela checkout antes de invoice.paid e evita duplicidade",()=>{
 const webhook=src("src/app/api/stripe/webhook/route.ts");
 assert.match(webhook,/Keep setup PENDING until the first invoice.paid/);
 assert.match(webhook,/if\(event\.type==="invoice\.paid"\) await confirmMonthly/);
 assert.match(webhook,/UPDATE platform_billing_charges SET status='CANCELED',stripe_subscription_id/);
 assert.match(webhook,/ensureTwelveMonthSubscriptionTerm/);
 assert.match(webhook,/stopSubscriptionAfter12/);
 assert.match(src("src/lib/saas/stripe-gateway.ts"),/cancel_at/);
});
test("retorno do Checkout não é prova de pagamento: status vem do ledger reconciliado",()=>{
 const page=src("src/app/assinatura/page.tsx");
 const status=src("src/app/api/assinatura/status/route.ts");
 assert.match(page,/api\/assinatura\/status\?session_id=/);
 assert.match(page,/paymentStatus==="CONFIRMED"/);
 assert.match(page,/A Stripe está confirmando o pagamento/);
 assert.match(status,/b\.status='PAID'/);
 assert.match(status,/p\.status='PAID'/);
 assert.match(status,/Cache-Control":"private,no-store/);
 assert.doesNotMatch(status,/UPDATE platform_entitlements|INSERT INTO platform_billing_charges/);
});
test("proxy permite somente endpoints de assinatura e não libera API geral ou legado",()=>{
 const proxy=src("src/proxy.ts");
 assert.match(proxy,/\/api\/assinatura/);
 assert.match(proxy,/Módulo indisponível para conta multiempresa/);
 assert.match(proxy,/Módulo em homologação para ambiente multiempresa/);
 const identity=src("src/lib/saas/identity.ts");
 assert.match(identity,/validateAccess\(row/);
 assert.match(identity,/\["TRIAL","ACTIVE","GRACE"\]/);
});
