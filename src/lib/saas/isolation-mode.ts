/** Fail closed when SaaS mode flags conflict; never switch operational databases silently. */
type Env=Record<string,string|undefined>;
export function isolationMode(env:Env):"qa"|"production"|null {
 const qa=env.SAAS_QA_MODE==="true";
 const live=env.SAAS_PRODUCTION_MODE==="true";
 if(qa&&live) throw new Error("Modos QA e produção não podem coexistir.");
 if(live && env.VERCEL_ENV!=="production")throw new Error("SaaS de produção requer Vercel Production.");
 if(qa && env.VERCEL_ENV==="production")throw new Error("SaaS QA nunca usa ambiente de produção.");
 return live?"production":qa?"qa":null;
}
