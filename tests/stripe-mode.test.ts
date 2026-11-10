import {test} from "node:test";
import assert from "node:assert/strict";
import {resolveStripeMode,assertStripeEventMode,expectedStripeCheckoutPrefix} from "../src/lib/saas/stripe-mode";
const base={STRIPE_BILLING_ENABLED:"true",STRIPE_WEBHOOK_SECRET:"whsec_example"};
test("nunca inicia cobrança quando desligada, mesmo com segredo real",()=>{
 assert.equal(resolveStripeMode({...base,STRIPE_BILLING_ENABLED:"false",STRIPE_SECRET_KEY:"sk_live_secret",VERCEL_ENV:"production",SAAS_PRODUCTION_MODE:"true"}),null);
});
test("chave live exige ambiente de produção e opt-in adicional",()=>{
 const env={...base,STRIPE_SECRET_KEY:"sk_live_secret",VERCEL_ENV:"production",CONTROL_DATABASE_URL:"postgresql://placeholder",NEXT_PUBLIC_DEMO:"false"};
 assert.throws(()=>resolveStripeMode(env),/ambiente inconsistente/);
 assert.equal(resolveStripeMode({...env,SAAS_PRODUCTION_MODE:"true"}),"live");
 assert.throws(()=>resolveStripeMode({...env,SAAS_PRODUCTION_MODE:"true",SAAS_QA_MODE:"true"}),/ambiente inconsistente/);
 assert.throws(()=>resolveStripeMode({...env,SAAS_PRODUCTION_MODE:"true",VERCEL_ENV:"preview"}),/ambiente inconsistente/);
});
test("chave de teste não pode habilitar cobrança live",()=>{
 const qa={...base,STRIPE_SECRET_KEY:"sk_test_example",SAAS_QA_MODE:"true",VERCEL_ENV:"preview"};
 assert.equal(resolveStripeMode(qa),"test");
 assert.throws(()=>resolveStripeMode({...qa,VERCEL_ENV:"production"}),/ambiente inconsistente/);
});
test("eventos e sessões não atravessam ambientes",()=>{
 assert.doesNotThrow(()=>assertStripeEventMode("live",true));
 assert.throws(()=>assertStripeEventMode("live",false),/outro ambiente/);
 assert.throws(()=>assertStripeEventMode("test",true),/outro ambiente/);
 assert.equal(expectedStripeCheckoutPrefix("live"),"cs_live_");
 assert.equal(expectedStripeCheckoutPrefix("test"),"cs_test_");
});


test("cobrança híbrida live é liberada somente por opt-in separado e mantém login legado",()=>{
 const env={...base,STRIPE_SECRET_KEY:"sk_live_secret",VERCEL_ENV:"production",
  CONTROL_DATABASE_URL:"postgresql://placeholder",SAAS_PRODUCTION_MODE:"false",
  SAAS_BILLING_HYBRID_ENABLED:"true",NEXT_PUBLIC_DEMO:"false"};
 assert.equal(resolveStripeMode(env),"live");
 assert.throws(()=>resolveStripeMode({...env,SAAS_BILLING_HYBRID_ENABLED:"false"}),/ambiente inconsistente/);
 assert.throws(()=>resolveStripeMode({...env,SAAS_QA_MODE:"true"}),/ambiente inconsistente/);
 assert.throws(()=>resolveStripeMode({...env,VERCEL_ENV:"preview"}),/ambiente inconsistente/);
 assert.throws(()=>resolveStripeMode({...env,NEXT_PUBLIC_DEMO:"true"}),/ambiente inconsistente/);
 assert.throws(()=>resolveStripeMode({...env,STRIPE_SECRET_KEY:"sk_test_secret"}),/ambiente inconsistente/);
 assert.throws(()=>resolveStripeMode({...env,STRIPE_WEBHOOK_SECRET:"missing"}),/Segredo de webhook/);
 assert.equal(resolveStripeMode({...env,STRIPE_BILLING_ENABLED:"false"}),null);
});
