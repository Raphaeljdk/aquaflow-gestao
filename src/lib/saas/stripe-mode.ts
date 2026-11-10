import {productionBillingMode} from "./billing-mode";

/** Isolated Stripe mode selection. NEVER infer live readiness from a key alone. */
export type StripeMode = "test" | "live";
type Env = Record<string,string|undefined>;
export function resolveStripeMode(env:Env): StripeMode | null {
  if(env.STRIPE_BILLING_ENABLED!=="true") return null;
  const key=env.STRIPE_SECRET_KEY??"";
  if(!env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_"))
    throw new Error("Segredo de webhook Stripe indisponível.");
  if(env.SAAS_QA_MODE==="true" && env.VERCEL_ENV!=="production" && key.startsWith("sk_test_"))
    return "test";
  if(productionBillingMode(env) && env.NEXT_PUBLIC_DEMO!=="true" &&
     Boolean(env.CONTROL_DATABASE_URL) && key.startsWith("sk_live_"))
    return "live";
  throw new Error("Stripe: ambiente inconsistente. Nenhuma transação autorizada.");
}
export function expectedStripeCheckoutPrefix(mode:StripeMode) {
  return mode==="live"?"cs_live_":"cs_test_";
}
export function assertStripeEventMode(mode:StripeMode, live:boolean) {
  if(live!==(mode==="live"))throw new Error("Evento Stripe pertence a outro ambiente.");
}
