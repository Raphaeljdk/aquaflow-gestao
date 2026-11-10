import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {productionBillingMode} from "../src/lib/saas/billing-mode";
import {stripeBillingReadiness} from "../src/lib/saas/billing-readiness";
import {resolveStripeMode} from "../src/lib/saas/stripe-mode";
const secure={
 VERCEL_ENV:"production",SAAS_PRODUCTION_MODE:"false",
 SAAS_BILLING_HYBRID_ENABLED:"true",STRIPE_BILLING_ENABLED:"true",
 STRIPE_SECRET_KEY:"sk_live_example",STRIPE_WEBHOOK_SECRET:"whsec_example",
 CONTROL_DATABASE_URL:"postgresql://placeholder",NEXT_PUBLIC_DEMO:"false",
};
test("gestor mantém login antigo enquanto billing de tenant fica pronto, com opt-in",()=>{
 assert.equal(productionBillingMode(secure),true);
 assert.equal(resolveStripeMode(secure),"live");
 assert.equal(stripeBillingReadiness(secure).liveConfigurationReady,true);
});
test("sem opt-in billing híbrido não pode funcionar",()=>{
 const env={...secure,SAAS_BILLING_HYBRID_ENABLED:"false"};
 assert.equal(productionBillingMode(env),false);
 assert.equal(stripeBillingReadiness(env).liveConfigurationReady,false);
 assert.throws(()=>resolveStripeMode(env),/ambiente inconsistente/);
});
test("Stripe nunca opera em produção sem chave live e webhook assinado",()=>{
 for(const [key,val] of [
  ["STRIPE_SECRET_KEY","sk_test_any"],
  ["STRIPE_SECRET_KEY",""],
  ["STRIPE_WEBHOOK_SECRET",""],
  ["STRIPE_WEBHOOK_SECRET","not-valid"],
  ["CONTROL_DATABASE_URL",""],
  ["NEXT_PUBLIC_DEMO","true"],
  ["SAAS_QA_MODE","true"],
  ["VERCEL_ENV","preview"]
 ]){
  const env={...secure,[key]:val};
  assert.equal(stripeBillingReadiness(env).liveConfigurationReady,false,key);
  assert.throws(()=>resolveStripeMode(env),undefined,key);
 }
});
test("checkout gestor só é permitido para empresa READY, dono confirmado e domínio oficial",()=>{
 const route=readFileSync("src/app/api/plataforma/saas/pilotos/[id]/checkout/route.ts","utf8");
 assert.match(route,/assertCheckoutManagementEnabled/);
 assert.match(route,/await requirePlatformAdmin\(\)/);
 assert.match(route,/checkOrigin\(request\)/);
 assert.match(route,/r.state!=="READY"/);
 assert.match(route,/r.owners<1/);
 assert.match(route,/status='PENDING'/);
 assert.match(route,/https:\/\/duchaelitte\.com\.br/);
});
