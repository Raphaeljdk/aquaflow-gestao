import "server-only";
/** Public diagnostic only: never persist provider response bodies or email addresses. */
export class ResendDeliveryError extends Error {
  readonly category: string;
  readonly httpStatus: number | null;
  constructor(category:string,httpStatus:number|null=null){
    super("resend_"+category);
    this.name="ResendDeliveryError";
    this.category=category;
    this.httpStatus=httpStatus;
  }
}
export function resendFailureCategory(status:number):string {
  if(status===400||status===422)return "invalid_request";
  if(status===401)return "invalid_api_key";
  if(status===403)return "sender_or_permission_restricted";
  if(status===409)return "idempotency_conflict";
  if(status===429)return "rate_limited";
  if(status>=500)return "provider_unavailable";
  return "provider_rejected";
}
export function requireValidResendSender(value:string|undefined):string {
  const sender=value?.trim()??"";
  // A verified custom domain sender is required in production.
  const extracted=sender.match(/<([^<>]+)>/)?.[1]??sender;
  if(!/^[^\s@<>]+@[^\s@<>]+\.[A-Za-z]{2,}$/.test(extracted)||
     extracted.toLowerCase().endsWith("@resend.dev"))
    throw new ResendDeliveryError("sender_not_configured");
  return sender;
}
