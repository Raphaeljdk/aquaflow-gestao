/** Enable signup independently from the legacy authentication switch. */
type Env=Record<string,string|undefined>;
export function publicSignupMode(env:Env):boolean{
  // Never enable public SaaS signup in preview or in the global cutover mode.
  return env.VERCEL_ENV==="production"
    && env.SAAS_PUBLIC_SIGNUP_ENABLED==="true"
    && env.SAAS_PRODUCTION_MODE!=="true"
    && env.SAAS_QA_MODE!=="true";
}
