import "server-only";
import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {loadInvoice,loadSubscription,loadStripeCharge,loadStripeDispute,stripeSubscriptionId} from "./stripe-gateway";

const uuid=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
type NoticeType="invoice.payment_failed"|"customer.subscription.deleted"|
 "charge.refunded"|"charge.dispute.created"|"charge.dispute.closed";
/**
 * Stripe incidents are ALWAYS verified by API. Persist a central audit and notify the owner.
 * Never blindly erase paid access: partial refunds, disputes and cancellations require review
 * of paid periods and contractual rights, even when the webhook itself is authentic.
 */
export async function processStripeIncident(db:PrismaClient,eventId:string,type:NoticeType,resourceId:string) {
 if(!/^evt_[A-Za-z0-9]+$/.test(eventId))throw new Error("Evento inválido.");
 let tenantId:string|null=null;
 let relatedPaymentId:string|null=null;
 let detail:string|null=null;
 let fullRefund=false;
 if(type==="invoice.payment_failed"){
  const invoice=await loadInvoice(resourceId);
  if(invoice.status==="paid")return {status:"ALREADY_RECOVERED" as const};
  const subId=stripeSubscriptionId(invoice);
  if(!subId)throw new Error("Fatura não vinculada à assinatura.");
  const subscription=await loadSubscription(subId);
  if(!uuid(subscription.metadata?.tenant_id??"")||!["ANNUAL_MONTHLY","MONTHLY_FLEX"].includes(subscription.metadata?.plan_code??"")||
     subscription.customer!==invoice.customer) throw new Error("Origem da fatura inválida.");
  tenantId=subscription.metadata!.tenant_id;
  relatedPaymentId=invoice.id;detail=subId;
  const check=await db.$queryRaw<Array<{qty:number}>>`
   SELECT count(*)::integer AS qty FROM platform_billing_charges WHERE tenant_id=${tenantId}::uuid
   AND provider='STRIPE' AND (stripe_subscription_id=${subId} OR id::text=${subscription.metadata?.setup_charge_id??""})`;
  if(!check[0]?.qty)throw new Error("Assinatura não foi criada pela plataforma.");
 }else if(type==="customer.subscription.deleted"){
  const sub=await loadSubscription(resourceId);
  if(sub.status!=="canceled"||!uuid(sub.metadata?.tenant_id??"")||
     sub.metadata?.plan_code!=="ANNUAL_MONTHLY")return {status:"NOT_APPLICABLE" as const};
  tenantId=sub.metadata!.tenant_id;detail=sub.id;
  const check=await db.$queryRaw<Array<{qty:number}>>`
   SELECT count(*)::integer AS qty FROM platform_billing_charges
   WHERE tenant_id=${tenantId}::uuid AND provider='STRIPE' AND
    (stripe_subscription_id=${sub.id} OR id::text=${sub.metadata?.setup_charge_id??""})`;
  if(!check[0]?.qty)throw new Error("Assinatura não reconhecida.");
 }else {
  const chargeId=type.startsWith("charge.dispute.")?
    (await loadStripeDispute(resourceId)).charge:resourceId;
  const charge=await loadStripeCharge(typeof chargeId==="string"?chargeId:chargeId.id);
  if(charge.currency!=="brl")throw new Error("Moeda incompatível.");
  if(type==="charge.refunded" && charge.amount_refunded<=0) return {status:"NOT_APPLICABLE" as const};
  if(type.startsWith("charge.dispute.") && !charge.disputed && type==="charge.dispute.created")
    return {status:"NOT_APPLICABLE" as const};
  relatedPaymentId=charge.invoice??charge.payment_intent;
  if(!relatedPaymentId)throw new Error("Pagamento Stripe sem referência.");
  const matched=await db.$queryRaw<Array<{tenant_id:string}>>`
    SELECT tenant_id::text FROM platform_billing_charges
    WHERE provider='STRIPE' AND provider_payment_id=${relatedPaymentId}
    AND status IN ('PAID','REFUNDED') LIMIT 2`;
  if(matched.length!==1)throw new Error("Cobrança original não localizada.");
  tenantId=matched[0].tenant_id;
  detail=typeof chargeId==="string"?chargeId:chargeId.id;
  fullRefund=type==="charge.refunded" && charge.amount>0&&charge.amount_refunded>=charge.amount;
 }
 if(!tenantId||!uuid(tenantId))throw new Error("Tenant inválido.");
 const finalTenantId=tenantId;
 const metadata=JSON.stringify({eventId,type,resourceId,paymentId:relatedPaymentId,detail,fullRefund});
 return db.$transaction(async tx=>{
  const events=await tx.$queryRaw<Array<{external_event_id:string}>>`
   INSERT INTO platform_billing_events(provider,external_event_id,event_hash,processed_at)
   VALUES('STRIPE',${eventId},${createHash("sha256").update(type+":"+resourceId).digest("hex")},now())
   ON CONFLICT(provider,external_event_id) DO NOTHING RETURNING external_event_id`;
  if(!events.length)return {status:"DUPLICATE" as const};
  if(fullRefund && relatedPaymentId){
   await tx.$executeRaw`
    UPDATE platform_billing_charges SET status='REFUNDED'
    WHERE tenant_id=${finalTenantId}::uuid AND provider='STRIPE'
      AND provider_payment_id=${relatedPaymentId} AND status='PAID'`;
  }
  await tx.$executeRaw`
    INSERT INTO platform_audit_events(tenant_id,action,metadata)
    VALUES(${finalTenantId}::uuid,'stripe_billing_incident',${metadata}::jsonb)`;
  await tx.$executeRaw`
    INSERT INTO platform_notification_outbox(tenant_id,channel,recipient,template_key,dedupe_key,payload)
    SELECT t.id,'EMAIL',t.owner_email,'billing_attention',${"stripe:notice:"+eventId},${metadata}::jsonb
    FROM platform_tenants t WHERE t.id=${finalTenantId}::uuid
    ON CONFLICT(dedupe_key) DO NOTHING`;
  return {status:"RECORDED_FOR_REVIEW" as const};
 });
}
