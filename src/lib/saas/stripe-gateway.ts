import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { resolveStripeMode, expectedStripeCheckoutPrefix, assertStripeEventMode } from "./stripe-mode";
import {twelfthCycleEnd} from "./stripe-contract-term";

export type StripePlan = "MENSAL" | "ANUAL_MENSAL" | "ANUAL_AVISTA";
export type StripeMethod = "CARD" | "PIX";
type Checkout = { id:string; url:string|null; mode:string; payment_status?:string;
 amount_total?:number|null; currency?:string|null; payment_intent?:string|null;
 metadata?:Record<string,string>|null; subscription?:string|null };
type Invoice = { id:string; status:string; amount_paid:number; currency:string; customer:string;
 subscription?:string|{id:string}|null; parent?:{subscription_details?:{subscription?:string|{id:string}}}|null;
 collection_method?:string; paid_out_of_band?:boolean; status_transitions?:{paid_at?:number|null}; created:number };
type Subscription = { id:string; customer:string; metadata?:Record<string,string>; status:string; start_date?:number;billing_cycle_anchor?:number;cancel_at?:number|null;cancel_at_period_end?:boolean };

export function requireStripe() {
 const mode=resolveStripeMode(process.env);
 if(!mode)throw new Error("Cobrança Stripe desabilitada.");
 return {mode,key:process.env.STRIPE_SECRET_KEY!};
}
export function stripePixEnabled() { return process.env.STRIPE_PIX_ENABLED==="true"; }
async function stripeApi<T>(path:string,body?:URLSearchParams,idempotencyKey?:string):Promise<T> {
 const {key:secret}=requireStripe();
 if(!/^\/v1\/(checkout\/sessions|payment_intents|invoices|subscriptions|charges|disputes)(?:\/[a-zA-Z0-9_]+)?$/.test(path))
  throw new Error("Endpoint Stripe inválido.");
 const response=await fetch("https://api.stripe.com"+path,{
  method:body?"POST":"GET",headers:{"Authorization":"Bearer "+secret,
   ...(body&&idempotencyKey?{"Idempotency-Key":idempotencyKey}:{}),
   ...(body?{"Content-Type":"application/x-www-form-urlencoded"}:{})},
  body:body?.toString(),cache:"no-store",signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)throw new Error("Stripe indisponível ou configuração inválida: "+response.status);
 return response.json() as Promise<T>;
}
export async function createStripeCheckout(info:{
 tenantId:string; ownerEmail:string; chargeId:string; plan:StripePlan; method:StripeMethod; origin:string
}) {
 const {mode}=requireStripe();
 const upFront=info.plan==="ANUAL_AVISTA";
 const flexible=info.plan==="MENSAL";
 if(!upFront && info.method!=="CARD")throw new Error("Assinatura mensal exige cartão.");
 if(upFront && info.method==="PIX" && !stripePixEnabled())
  throw new Error("Pix Stripe ainda não habilitado para esta conta.");
 const p=new URLSearchParams();
 p.set("mode",upFront?"payment":"subscription");
 p.set("customer_email",info.ownerEmail);
 p.set("client_reference_id",info.tenantId);
 p.set("payment_method_types[0]",info.method==="PIX"?"pix":"card");
 p.set("line_items[0][quantity]","1");
 p.set("line_items[0][price_data][currency]","brl");
 p.set("line_items[0][price_data][unit_amount]",upFront?"79000":"8000");
 p.set("line_items[0][price_data][product_data][name]",upFront?"Ducha Elitte - licença anual à vista":"Ducha Elitte - contrato anual em 12 mensalidades");
 if(!upFront)p.set("line_items[0][price_data][recurring][interval]","month");
 p.set("metadata[tenant_id]",info.tenantId);
 p.set("metadata[charge_id]",info.chargeId);
 p.set("metadata[plan_code]",upFront?"ANNUAL_UPFRONT":"ANNUAL_MONTHLY");
 if(!upFront) {
  p.set("subscription_data[metadata][tenant_id]",info.tenantId);
  p.set("subscription_data[metadata][plan_code]","ANNUAL_MONTHLY");
  p.set("subscription_data[metadata][setup_charge_id]",info.chargeId);
 }
 p.set("expires_at",String(Math.floor(Date.now()/1000)+1800));
 p.set("success_url",info.origin+"/assinatura?retorno=sucesso");
 p.set("cancel_url",info.origin+"/assinatura?retorno=cancelado");
 const checkout=await stripeApi<Checkout>("/v1/checkout/sessions",p,"aquaflow:"+info.chargeId);
 if(!checkout.id?.startsWith(expectedStripeCheckoutPrefix(mode)) || !checkout.url?.startsWith("https://checkout.stripe.com/"))
  throw new Error("Stripe não retornou um checkout válido para o ambiente configurado.");
 return {id:checkout.id,url:checkout.url};
}
export async function loadCheckout(id:string) {
 if(!/^cs_(?:test|live)_[a-zA-Z0-9]+$/.test(id))throw new Error("Sessão Stripe inválida.");
 if(!id.startsWith(expectedStripeCheckoutPrefix(requireStripe().mode)))throw new Error("Checkout de outro ambiente.");
 return stripeApi<Checkout>("/v1/checkout/sessions/"+id);
}
export async function loadPaymentIntent(id:string) {
 if(!/^pi_[a-zA-Z0-9]+$/.test(id))throw new Error("Pagamento Stripe inválido.");
 return stripeApi<{id:string;status:string;amount_received:number;currency:string;created:number}>("/v1/payment_intents/"+id);
}
export async function loadInvoice(id:string) {
 if(!/^in_[a-zA-Z0-9]+$/.test(id))throw new Error("Fatura Stripe inválida.");
 return stripeApi<Invoice>("/v1/invoices/"+id);
}
export async function loadSubscription(id:string) {
 if(!/^sub_[a-zA-Z0-9]+$/.test(id))throw new Error("Assinatura Stripe inválida.");
 return stripeApi<Subscription>("/v1/subscriptions/"+id);
}
/** Install the terminal date at subscription activation, not after the twelfth invoice.
 * A lost webhook must never leave a contract open for a thirteenth charge. */
export async function ensureTwelveMonthSubscriptionTerm(id:string){
 const sub=await loadSubscription(id);
 if(sub.metadata?.plan_code!=="ANNUAL_MONTHLY"||!sub.metadata?.tenant_id)
  throw new Error("Contrato Stripe não reconhecido.");
 const anchor=sub.billing_cycle_anchor??sub.start_date;
 if(!anchor)throw new Error("Stripe não retornou a data base do contrato.");
 const end=twelfthCycleEnd(anchor);
 if(end<=Math.floor(Date.now()/1000)+60)throw new Error("Fim de contrato já alcançado; revisar manualmente.");
 if(sub.cancel_at && sub.cancel_at<=end)return {end:sub.cancel_at,configured:true};
 const p=new URLSearchParams();
 p.set("cancel_at",String(end));
 p.set("proration_behavior","none");
 const updated=await stripeApi<Subscription>("/v1/subscriptions/"+id,p,"ducha-elitte:term12:"+id);
 if(updated.cancel_at!==end)throw new Error("Stripe não confirmou cancelamento programado após 12 meses.");
 return {end,configured:true};
}
export async function stopSubscriptionAfter12(id:string) {
 if(!/^sub_[a-zA-Z0-9]+$/.test(id))throw new Error("Assinatura Stripe inválida.");
 const p=new URLSearchParams();p.set("cancel_at_period_end","true");
 await stripeApi<Subscription>("/v1/subscriptions/"+id,p);
}
/** Only read provider objects; incident events never use the untrusted webhook payload as financial proof. */
export async function loadStripeCharge(id:string) {
 if(!/^ch_[a-zA-Z0-9]+$/.test(id))throw new Error("Cobrança Stripe inválida.");
 return stripeApi<{id:string;payment_intent:string|null;invoice:string|null;amount:number;
  amount_refunded:number;currency:string;refunded:boolean;disputed:boolean}>("/v1/charges/"+id);
}
export async function loadStripeDispute(id:string) {
 if(!/^dp_[a-zA-Z0-9]+$/.test(id))throw new Error("Contestação Stripe inválida.");
 return stripeApi<{id:string;charge:string|{id:string};status:string}>("/v1/disputes/"+id);
}
export function stripeSubscriptionId(invoice:Invoice) {
 const raw=invoice.subscription??invoice.parent?.subscription_details?.subscription;
 return typeof raw==="string"?raw:raw?.id??null;
}
/** Tolerance of five minutes and constant-time v1 validation. Never trust unverified event bodies. */
export function verifyStripeWebhook(body:string,header:string|null,secret:string|undefined,now=Date.now()) {
 if(!header||!secret||!secret.startsWith("whsec_"))throw new Error("Assinatura Stripe ausente.");
 const entries=header.split(",").map(v=>v.trim().split("="));
 const stamp=entries.find(v=>v[0]==="t")?.[1];
 const values=entries.filter(v=>v[0]==="v1").map(v=>v[1]);
 if(!stamp||!/^[0-9]{10,13}$/.test(stamp)||Math.abs(now-Number(stamp)*1000)>300000)
  throw new Error("Webhook Stripe expirado.");
 const digest=createHmac("sha256",secret).update(stamp+"."+body).digest("hex");
 const good=values.some(v=>/^[a-f0-9]{64}$/i.test(v) &&
  timingSafeEqual(Buffer.from(digest,"hex"),Buffer.from(v,"hex")));
 if(!good)throw new Error("Assinatura de webhook inválida.");
 const event=JSON.parse(body) as {id:string;type:string;livemode:boolean;data:{object:{id?:string}}};
 if(!/^evt_[a-zA-Z0-9]+$/.test(event.id)||!event.data?.object?.id)
  throw new Error("Identificador de evento Stripe inválido.");
 assertStripeEventMode(requireStripe().mode,event.livemode);
 return event;
}
