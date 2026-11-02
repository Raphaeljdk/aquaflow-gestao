import { NextRequest,NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { withControlPlane } from "@/lib/saas/control-plane";
import { assertSaasManagementEnabled } from "@/lib/saas/pilot-control";
import { checkOrigin,apiError } from "@/lib/api";
import { createStripeCheckout, type StripePlan,type StripeMethod } from "@/lib/saas/stripe-gateway";
import { BusinessError } from "@/lib/domain";

export const runtime="nodejs";
export const dynamic="force-dynamic";
/** Operator-issued payment links only; neither anonymous visitors nor expired tenant sessions may choose a tenant ID. */
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
 try {
  await requirePlatformAdmin();assertSaasManagementEnabled();checkOrigin(request);
  if(process.env.STRIPE_BILLING_ENABLED!=="true")
   throw new BusinessError("Stripe indisponível para este ambiente.",503);
  const {id}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(id))throw new BusinessError("Estabelecimento inválido.",400);
  if(Number(request.headers.get("content-length")||0)>2000)throw new BusinessError("Requisição muito grande.",413);
  const body=await request.json() as {plan?:StripePlan;method?:StripeMethod};
  const plan=body?.plan,method=body?.method;
  if((plan!=="ANUAL_MENSAL"&&plan!=="ANUAL_AVISTA") || (method!=="CARD"&&method!=="PIX") ||
    (plan==="ANUAL_MENSAL"&&method!=="CARD"))
    throw new BusinessError("Plano ou pagamento não permitido.",400);
  if(process.env.SAAS_PRODUCTION_MODE==="true" &&
     !["https://duchaelitte.com.br","https://www.duchaelitte.com.br"].includes(new URL(request.url).origin))
   throw new BusinessError("Origem de produção não autorizada.",403);
  const chargeId=randomUUID(),expected=plan==="ANUAL_AVISTA"?79000:8000;
  const owner=await withControlPlane(db=>db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"stripe:"+id}))`;
    const rows=await tx.$queryRaw<Array<{email:string;state:string;owners:number}>>`
      SELECT t.owner_email AS email,t.state,
        (SELECT count(*)::integer FROM platform_memberships m
         WHERE m.tenant_id=t.id AND m.role='OWNER' AND m.enabled=true) AS owners
      FROM platform_tenants t WHERE t.id=${id}::uuid FOR UPDATE`;
    const r=rows[0];
    if(!r || r.state!=="READY")
      throw new BusinessError("Aguardando banco individual verificado.",409);
    const current=await tx.$queryRaw<Array<{state:string;paid_through:Date|null}>>`
      SELECT state,paid_through FROM platform_entitlements WHERE tenant_id=${id}::uuid`;
    if(current[0]?.state==="ACTIVE" && current[0].paid_through && current[0].paid_through>new Date())
      throw new BusinessError("Assinatura ativa: não gerar cobrança duplicada.",409);
    const duplicates=await tx.$queryRaw<Array<{qty:number}>>`
      SELECT count(*)::integer AS qty FROM platform_billing_charges
      WHERE tenant_id=${id}::uuid AND provider='STRIPE' AND status='PENDING'
      AND created_at>now()-INTERVAL '30 minutes'`;
    if(duplicates[0]?.qty)throw new BusinessError("Já existe um link de pagamento recente para esta empresa.",409);
    await tx.$executeRaw`
      INSERT INTO platform_billing_charges(id,tenant_id,provider,external_reference,expected_cents,plan_code)
      VALUES(${chargeId}::uuid,${id}::uuid,'STRIPE',${chargeId},${expected},${plan==="ANUAL_AVISTA"?"ANNUAL_UPFRONT":"CHECKOUT_MONTHLY"})`;
    return r.email;
  }));
  let checkout;
  try { checkout=await createStripeCheckout({tenantId:id,ownerEmail:owner,chargeId,
    plan:plan!,method:method!,origin:new URL(request.url).origin}); }
  catch(error) {
    await withControlPlane(db=>db.$executeRaw`
      UPDATE platform_billing_charges SET status='CANCELED'
      WHERE id=${chargeId}::uuid AND status='PENDING'`);
    throw error;
  }
  return NextResponse.json({url:checkout.url,sessionId:checkout.id},
   {headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});
 } catch(e){return apiError(e);}
}
