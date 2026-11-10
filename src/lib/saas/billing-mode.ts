/** Enable payment billing without forcing existing operators into a new login system.
 * The legacy/hybrid cutover is deliberate and production-only. Enabling this
 * flag does NOT bypass Stripe credentials, verified OWNER, tenant isolation,
 * confirmed settlement or the Stripe webhook signature.
 */
export function productionBillingMode(env:Record<string,string|undefined>):boolean {
  return env.VERCEL_ENV==="production" &&
    env.SAAS_QA_MODE!=="true" &&
    (env.SAAS_PRODUCTION_MODE==="true" ||
      (env.SAAS_PRODUCTION_MODE!=="true" && env.SAAS_BILLING_HYBRID_ENABLED==="true"));
}
