/** Small, pure payment rules so eligibility can be tested without Stripe secrets. */
export function checkoutEntitlementEligible(state:string,paidThrough:Date|null,now=new Date()){
 if(!["PENDING","TRIAL","EXPIRED","GRACE","ACTIVE"].includes(state))return false;
 // A legacy ACTIVE record without a paid-through date is inconsistent:
 // do not create a second subscription until an administrator reconciles it.
 if(state==="ACTIVE" && (!paidThrough || paidThrough.getTime()>now.getTime()))return false;
 if(paidThrough && paidThrough.getTime()>now.getTime())return false;
 return true;
}
export function checkoutAllowedOrigin(origin:string,env:Record<string,string|undefined>){
 if(["https://www.duchaelitte.com.br","https://duchaelitte.com.br"].includes(origin))return true;
 return env.SAAS_QA_MODE==="true" && env.VERCEL_ENV==="preview" &&
   /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);
}
export function validCheckoutCombination(plan:string,method:string){
 return ["MENSAL","ANUAL_MENSAL","ANUAL_AVISTA"].includes(plan) &&
   ["CARD","PIX"].includes(method) &&
   (plan==="ANUAL_AVISTA" || method==="CARD");
}
