/** Restricts recovery of explicitly approved pre-provisioning signups to the central administrator. */
type Env=Record<string,string|undefined>;
export function adminOnboardingMode(env:Env):boolean{
 return env.VERCEL_ENV==="production" &&
   env.SAAS_ADMIN_ONBOARDING_ENABLED==="true" &&
   env.SAAS_PRODUCTION_MODE!=="true" &&
   env.SAAS_QA_MODE!=="true";
}
