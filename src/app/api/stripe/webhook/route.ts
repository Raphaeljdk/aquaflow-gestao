import { NextRequest,NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { withControlPlane } from "@/lib/saas/control-plane";
import { recordVerifiedSettlement } from "@/lib/saas/reconciliation";
import { loadCheckout,loadPaymentIntent,loadInvoice,loadSubscription,stopSubscriptionAfter12,
 stripeSubscriptionId,verifyStripeWebhook, requireStripe } from "@/lib/saas/stripe-gateway";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const isUuid=(v:string)=>/^[0-9a-f-]{36}$/i.test(v);
async function confirmUpfront(sessionId:string) {
 const session=await loadCheckout(sessionId);
 if(session.mode!=="payment"||session.payment_status!=="paid"||session.amount_total!==79000||
    session.currency!=="brl"||!session.metadata?.charge_id||!session.metadata.tenant_id)
  throw new Error("Checkout não liquidado ou plano divergente.");
 const chargeId=session.metadata.charge_id, tenantId=session.metadata.tenant_id;
 if(!isUuid(chargeId)||!isUuid(tenantId)||session.metadata.plan_code!=="ANNUAL_UPFRONT")
  throw new Error("Identidade da cobrança inválida.");
 if(!session.payment_intent||typeof session.payment_intent!=="string")
  throw new Error("Sem confirmação do pagamento.");
 const payment=await loadPaymentIntent(session.payment_intent);
 if(payment.status!=="succeeded"||payment.amount_received!==79000||payment.currency!=="brl")
  throw new Error("Pagamento ainda não liquidado.");
 return withControlPlane(async db=>{
  const records=await db.$queryRaw<Array<{tenant_id:string;plan_code:string}>>`
    SELECT tenant_id::text,plan_code FROM platform_billing_charges
    WHERE id=${chargeId}::uuid AND provider='STRIPE' AND external_reference=${chargeId}`;
  if(records[0]?.tenant_id!==tenantId||records[0]?.plan_code!=="ANNUAL_UPFRONT")
   throw new Error("Cobrança não corresponde ao estabelecimento.");
  return recordVerifiedSettlement(db,chargeId,{
   provider:"STRIPE",externalReference:chargeId,paymentId:payment.id,
   receivedCents:79000,settledAt:new Date(),verifiedWithProvider:true
  });
 });
}
async function confirmMonthly(invoiceId:string) {
 const invoice=await loadInvoice(invoiceId);
 const subId=stripeSubscriptionId(invoice);
 if(invoice.status!=="paid"||invoice.amount_paid!==8000||invoice.currency!=="brl"||
   invoice.collection_method!=="charge_automatically"||!subId)
  throw new Error("Fatura mensal não liquidada.");
 const subscription=await loadSubscription(subId);
 const tenantId=subscription.metadata?.tenant_id;
 if(!tenantId||!isUuid(tenantId)||subscription.metadata?.plan_code!=="ANNUAL_MONTHLY"||
    subscription.customer!==invoice.customer)
  throw new Error("Assinatura não corresponde ao estabelecimento.");
 const stamp=invoice.status_transitions?.paid_at ?? invoice.created;
 if(!Number.isFinite(stamp))throw new Error("Liquidação sem data válida.");
 const outcome=await withControlPlane(async db=>{
  const tenants=await db.$queryRaw<Array<{state:string}>>`
   SELECT state FROM platform_tenants WHERE id=${tenantId}::uuid`;
  if(tenants[0]?.state!=="READY")throw new Error("Empresa não provisionada.");
  const created=await db.$queryRaw<Array<{id:string}>>`
    INSERT INTO platform_billing_charges(id,tenant_id,provider,external_reference,
      expected_cents,plan_code,stripe_subscription_id)
    VALUES(${randomUUID()}::uuid,${tenantId}::uuid,'STRIPE',${invoice.id},8000,'MONTHLY',${subId})
    ON CONFLICT(provider,external_reference) DO UPDATE SET stripe_subscription_id=EXCLUDED.stripe_subscription_id
    RETURNING id::text`;
  if(!created[0])throw new Error("Fatura não registrada.");
  const result=await recordVerifiedSettlement(db,created[0].id,{
    provider:"STRIPE",externalReference:invoice.id,paymentId:invoice.id,
    receivedCents:8000,settledAt:new Date(stamp*1000),verifiedWithProvider:true
  });
  const count=await db.$queryRaw<Array<{qty:number}>>`
    SELECT count(*)::integer AS qty FROM platform_billing_charges
    WHERE stripe_subscription_id=${subId} AND status='PAID' AND plan_code='MONTHLY'`;
  return {...result,count:count[0]?.qty??0};
 });
 // Twelve monthly invoices complete this contract. Prevent a silent 13th charge.
 if(outcome.count>=12) await stopSubscriptionAfter12(subId);
 return outcome;
}
async function finishCheckout(sessionId:string){
 const session=await loadCheckout(sessionId);
 if(session.mode==="payment")return confirmUpfront(sessionId);
 if(session.mode==="subscription" && session.payment_status==="paid" && session.metadata?.charge_id){
  const id=session.metadata.charge_id;
  if(isUuid(id)){
    await withControlPlane(db=>db.$executeRaw`
      UPDATE platform_billing_charges SET status='CANCELED'
      WHERE id=${id}::uuid AND provider='STRIPE' AND plan_code='CHECKOUT_MONTHLY' AND status='PENDING'`);
  }
 }
 return {status:"SUBSCRIPTION_PENDING_INVOICE"};
}
/** Stripe-signed events are triggers, not proof: each checkout/invoice is retrieved from Stripe. */
export async function POST(request:NextRequest) {
 try { requireStripe(); } catch {
  return NextResponse.json({error:"Cobranças Stripe desabilitadas."},{status:503});
 }
 try {
  if(Number(request.headers.get("content-length")||0)>120000)
   return NextResponse.json({error:"Evento grande demais."},{status:413});
  const raw=await request.text();
  if(raw.length>120000)return NextResponse.json({error:"Evento grande demais."},{status:413});
  const event=verifyStripeWebhook(raw,request.headers.get("stripe-signature"),process.env.STRIPE_WEBHOOK_SECRET);
  if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded")
    await finishCheckout(event.data.object.id!);
  else if(event.type==="invoice.paid") await confirmMonthly(event.data.object.id!);
  // Other event types are intentionally ignored: they must never grant access.
  return NextResponse.json({received:true},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  console.error("[stripe-webhook] Evento rejeitado ou pendente:",error instanceof Error?error.message:"unknown");
  return NextResponse.json({error:"Evento não confirmado."},{status:400});
 }
}
