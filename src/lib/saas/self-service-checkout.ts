import "server-only";
import {createHash,randomBytes,randomUUID} from "node:crypto";
import {BusinessError} from "@/lib/domain";
import {withControlPlane} from "./control-plane";
import {requireValidResendSender} from "./resend-diagnostics";
import {createStripeCheckout,requireStripe,stripePixEnabled,type StripeMethod,type StripePlan} from "./stripe-gateway";
import {checkoutEntitlementEligible,checkoutAllowedOrigin,validCheckoutCombination} from "./checkout-policy";

const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN=/^[a-zA-Z0-9_-]{43}$/;
const digest=(s:string)=>createHash("sha256").update(s).digest("hex");
const neutral="Se existir um estabelecimento elegível com este e-mail, você receberá um link seguro para escolher um plano. Verifique também o spam.";
/** Request a one-time checkout link by email. Never reveal whether the address exists. */
export async function requestOwnerPaymentLink(input:{email:string;ip:string}){
 requireStripe(); // No link if the provider is not actually enabled in this environment.
 const email=input.email.trim().toLowerCase();
 if(!EMAIL.test(email)||email.length>254)throw new BusinessError("Informe um e-mail válido.",400);
 const salt=process.env.NEXTAUTH_SECRET??process.env.AUTH_SECRET;
 if(!salt||!process.env.RESEND_API_KEY||!process.env.NOTIFICATION_FROM_EMAIL)
   throw new BusinessError("Envio de pagamento indisponível.",503);
 const emailHash=digest(salt+":checkout:email:"+email);
 const requesterHash=digest(salt+":checkout:ip:"+input.ip.slice(0,100));
 const token=randomBytes(32).toString("base64url");
 const tokenHash=digest(token);
 const eligible=await withControlPlane(db=>db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${emailHash}))`;
  const rows=await tx.$queryRaw<Array<{id:string;state:string;paid_through:Date|null}>>`
   SELECT t.id::text,e.state,e.paid_through FROM platform_tenants t
   JOIN platform_entitlements e ON e.tenant_id=t.id
   WHERE lower(t.owner_email)=${email} AND t.state='READY'
     AND t.neon_project_id IS NOT NULL AND t.encrypted_database_url IS NOT NULL
     AND EXISTS(SELECT 1 FROM platform_memberships m
       JOIN platform_identities i ON i.id=m.identity_id
       WHERE m.tenant_id=t.id AND m.role='OWNER' AND m.enabled AND i.enabled
         AND lower(i.email)=${email})
   LIMIT 2`;
  if(rows.length!==1||!checkoutEntitlementEligible(rows[0].state,rows[0].paid_through))return false;
  const rate=await tx.$queryRaw<Array<{email_count:number;ip_count:number}>>`
   SELECT
    (SELECT count(*)::int FROM platform_checkout_access_tokens
      WHERE email_hash=${emailHash} AND created_at>now()-INTERVAL '1 hour') AS email_count,
    (SELECT count(*)::int FROM platform_checkout_access_tokens
      WHERE requester_hash=${requesterHash} AND created_at>now()-INTERVAL '1 hour') AS ip_count`;
  if((rate[0]?.email_count??0)>=3||(rate[0]?.ip_count??0)>=10)return false;
  await tx.$executeRaw`UPDATE platform_checkout_access_tokens
   SET state='USED',used_at=now() WHERE tenant_id=${rows[0].id}::uuid AND state='PENDING'`;
  await tx.$executeRaw`
   INSERT INTO platform_checkout_access_tokens(token_hash,tenant_id,email_hash,requester_hash,expires_at)
   VALUES(${tokenHash},${rows[0].id}::uuid,${emailHash},${requesterHash},now()+INTERVAL '20 minutes')`;
  return true;
 }));
 if(!eligible)return {message:neutral};
 // This link never carries the Neon tenant connection, passwords or a Stripe key.
 const url="https://www.duchaelitte.com.br/assinatura?token="+encodeURIComponent(token);
 try{
  const response=await fetch("https://api.resend.com/emails",{
   method:"POST",cache:"no-store",signal:AbortSignal.timeout(12000),
   headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json",
    "Idempotency-Key":"ducha-checkout-"+tokenHash},
   body:JSON.stringify({
    from:requireValidResendSender(process.env.NOTIFICATION_FROM_EMAIL),to:[email],
    subject:"Ducha Elitte | Escolher plano e continuar",
    text:"Você solicitou um link para contratar ou renovar seu plano Ducha Elitte.\n\n"
     +"Acesse este link individual, válido por 20 minutos: "+url
     +"\n\nO link apenas permite escolher o plano; nenhuma cobrança ocorre sem você confirmar o pagamento na Stripe.\n"
     +"Se não solicitou, ignore a mensagem.",
    html:`<main style="font-family:Arial,Helvetica,sans-serif;max-width:540px;margin:auto;background:#111;color:#fff;padding:30px;border-radius:18px">
     <p style="font-size:12px;color:#facc15;font-weight:bold;letter-spacing:2px">DUCHA ELITTE</p>
     <h1>Continue com seu lava-rápido</h1><p>Escolha seu plano e pague com segurança na Stripe.</p>
     <p style="margin:32px 0"><a href="${url}" style="background:#facc15;color:#111;padding:16px 22px;border-radius:11px;text-decoration:none;font-weight:bold">Escolher meu plano</a></p>
     <p style="font-size:13px;color:#bbb">Link individual, válido por 20 minutos. Nenhuma cobrança será efetuada sem sua confirmação. Se você não pediu, ignore este e-mail.</p></main>`
   })
  });
  if(!response.ok)throw new Error("provider_rejected");
 }catch{
  // If delivery outcome is uncertain, do not retry with the same token.
  await withControlPlane(db=>db.$executeRaw`
   UPDATE platform_checkout_access_tokens SET state='USED',used_at=now()
   WHERE token_hash=${tokenHash} AND state='PENDING'`);
  throw new BusinessError("O envio do link está indisponível. Tente novamente mais tarde.",503);
 }
 return {message:neutral};
}

/** Consume a verified link and create exactly one tenant-scoped Stripe checkout. */
export async function checkoutWithOwnerLink(input:{token:string;plan:StripePlan;method:StripeMethod;origin:string}){
 const {mode}=requireStripe();
 if(!checkoutAllowedOrigin(input.origin,process.env))
  throw new BusinessError("Origem não autorizada.",403);
 if(!TOKEN.test(input.token))throw new BusinessError("Link de pagamento inválido.",400);
 if(!validCheckoutCombination(input.plan,input.method))
  throw new BusinessError("Plano ou meio de pagamento inválido.",400);
 if(input.method==="PIX"&&!stripePixEnabled())
  throw new BusinessError("Pix ainda não disponível para esta conta Stripe.",409);
 const hash=digest(input.token),chargeId=randomUUID(),expected=input.plan==="ANUAL_AVISTA"?79000:8000;
 const owner=await withControlPlane(db=>db.$transaction(async tx=>{
  const rows=await tx.$queryRaw<Array<{
    tenant_id:string;email:string;email_hash:string;tenant_state:string;license_state:string;
    paid_through:Date|null;has_db:boolean;owner_verified:boolean
  }>>`
   SELECT l.tenant_id::text,t.owner_email AS email,l.email_hash,t.state AS tenant_state,
     e.state AS license_state,e.paid_through,
     (t.neon_project_id IS NOT NULL AND t.encrypted_database_url IS NOT NULL) AS has_db,
     EXISTS(SELECT 1 FROM platform_memberships m JOIN platform_identities i
        ON i.id=m.identity_id WHERE m.tenant_id=t.id AND m.enabled AND i.enabled
        AND m.role='OWNER' AND lower(i.email)=lower(t.owner_email)) AS owner_verified
   FROM platform_checkout_access_tokens l
   JOIN platform_tenants t ON t.id=l.tenant_id
   JOIN platform_entitlements e ON e.tenant_id=t.id
   WHERE l.token_hash=${hash} AND l.state='PENDING' AND l.expires_at>now()
   FOR UPDATE OF l,t,e`;
  const r=rows[0];
  const salt=process.env.NEXTAUTH_SECRET??process.env.AUTH_SECRET;
  // A previous owner must never be able to pay after the tenant's email changed.
  const emailMatches=!!r&&!!salt&&r.email_hash===digest(salt+":checkout:email:"+r.email.trim().toLowerCase());
  if(!r||!emailMatches||r.tenant_state!=="READY"||!r.has_db||!r.owner_verified||
     !checkoutEntitlementEligible(r.license_state,r.paid_through))
   throw new BusinessError("Link expirado, conta não ativada ou assinatura já vigente.",409);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"stripe:"+r.tenant_id}))`;
  const pending=await tx.$queryRaw<Array<{count:number}>>`
   SELECT count(*)::int AS count FROM platform_billing_charges
   WHERE tenant_id=${r.tenant_id}::uuid AND provider='STRIPE'
    AND status='PENDING'
    AND (created_at>now()-INTERVAL '45 minutes'
       OR plan_code IN ('CHECKOUT_MONTHLY','CHECKOUT_FLEX'))`;
  if((pending[0]?.count??0)>0)
   throw new BusinessError("Já existe checkout ou assinatura pendente. Consulte seu e-mail ou o suporte.",409);
  await tx.$executeRaw`UPDATE platform_checkout_access_tokens SET state='USED',used_at=now()
   WHERE token_hash=${hash} AND state='PENDING'`;
  await tx.$executeRaw`
    INSERT INTO platform_billing_charges(id,tenant_id,provider,external_reference,expected_cents,plan_code)
    VALUES(${chargeId}::uuid,${r.tenant_id}::uuid,'STRIPE',${chargeId},${expected},
      ${input.plan==="ANUAL_AVISTA"?"ANNUAL_UPFRONT":input.plan==="MENSAL"?"CHECKOUT_FLEX":"CHECKOUT_MONTHLY"})`;
  return {tenantId:r.tenant_id,email:r.email};
 }));
 try{
  const checkout=await createStripeCheckout({
   tenantId:owner.tenantId,ownerEmail:owner.email,chargeId,
   plan:input.plan,method:input.method,origin:input.origin
  });
  if(!checkout.id.startsWith(mode==="live"?"cs_live_":"cs_test_"))
   throw new Error("Checkout incorreto para este ambiente.");
  await withControlPlane(db=>db.$executeRaw`
   UPDATE platform_billing_charges SET stripe_checkout_session_id=${checkout.id}
   WHERE id=${chargeId}::uuid AND status='PENDING'`);
  return {url:checkout.url};
 }catch{
  await withControlPlane(db=>db.$executeRaw`
    UPDATE platform_billing_charges SET status='CANCELED'
    WHERE id=${chargeId}::uuid AND status='PENDING'`);
  throw new BusinessError("Não foi possível abrir o checkout. Solicite um novo link.",503);
 }
}
