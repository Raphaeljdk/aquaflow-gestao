/** Email notices for expired licenses only, even while public signup stays locked. */
export function licenseNotificationsMode(env:Record<string,string|undefined>):boolean{
 return env.VERCEL_ENV==="production" &&
   env.SAAS_LICENSE_NOTIFICATIONS_ENABLED==="true" &&
   env.SAAS_QA_MODE!=="true";
}
