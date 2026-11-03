/** Descriptive, read-only billing gate. Never exposes secret values or initiates a charge. */
export function stripeBillingReadiness(env:Record<string,string|undefined>){
 const blockers:string[]=[];
 if(env.VERCEL_ENV!=="production")blockers.push("Ambiente de produção");
 if(env.SAAS_PRODUCTION_MODE!=="true")blockers.push("Migração e isolamento SaaS ainda não liberados");
 if(env.STRIPE_BILLING_ENABLED!=="true")blockers.push("STRIPE_BILLING_ENABLED não habilitado");
 if(!env.STRIPE_SECRET_KEY?.startsWith("sk_live_"))blockers.push("Chave Stripe live não validada");
 if(!env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_"))blockers.push("Assinatura do webhook não configurada");
 if(!env.CONTROL_DATABASE_URL)blockers.push("Banco central não configurado");
 if(env.NEXT_PUBLIC_DEMO==="true")blockers.push("Modo demonstração ativo");
 return {
  liveConfigurationReady:blockers.length===0,
  pixFlagEnabled:env.STRIPE_PIX_ENABLED==="true",
  blockers,
  // These cannot be inferred from environment variables:
  checksStillRequired:["Webhook live recebendo eventos assinados","Pagamento real/teste controlado e conciliação ponta a ponta",
    "Meios de pagamento aprovados pela Stripe","Conciliação, reembolso e estorno homologados"]
 };
}
