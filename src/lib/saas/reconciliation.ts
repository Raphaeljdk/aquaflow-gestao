import type { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import {queueOwnerInvitation} from "./secure-owner-invites";
import { assertSettlementMatchesCharge,type VerifiedSettlement } from "./entitlement";

/**
 * Only call with a VERIFIED provider lookup. A webhook body is never evidence.
 * Transaction lock + unique event ID stop duplicated extensions of paid periods.
 */
export async function recordVerifiedSettlement(db:PrismaClient,chargeId:string,payment:VerifiedSettlement) {
 if(!/^[0-9a-f-]{36}$/i.test(chargeId))throw new Error("Cobrança inválida.");
 return db.$transaction(async tx=>{
  const charges=await tx.$queryRaw<Array<{
    tenant_id:string; provider:string; external_reference:string; expected_cents:number; status:string; plan_code:string
  }>>`
    SELECT tenant_id::text,provider,external_reference,expected_cents,status,plan_code
    FROM platform_billing_charges WHERE id=${chargeId}::uuid FOR UPDATE
  `;
  const charge=charges[0];
  if(!charge)throw new Error("Cobrança desconhecida.");
  assertSettlementMatchesCharge({
    provider:charge.provider,externalReference:charge.external_reference,
    expectedCents:charge.expected_cents,status:charge.status
  },payment);
  if(charge.status==="PAID")return {status:"ALREADY_PAID" as const};
  const months=charge.plan_code==="ANNUAL_UPFRONT"?12:charge.plan_code==="MONTHLY"?1:0;
  if(!months)throw new Error("Plano não suportado.");
  const eventId=payment.paymentId;
  const eventHash=createHash("sha256").update(payment.paymentId+":"+payment.externalReference).digest("hex");
  const processed=await tx.$queryRaw<Array<{external_event_id:string}>>`
    INSERT INTO platform_billing_events(provider,external_event_id,event_hash,processed_at)
    VALUES(${charge.provider},${eventId},${eventHash},now())
    ON CONFLICT(provider,external_event_id) DO NOTHING
    RETURNING external_event_id
  `;
  if(!processed.length)return {status:"ALREADY_PROCESSED" as const};
  await tx.$executeRaw`
    UPDATE platform_billing_charges
    SET status='PAID',paid_at=${payment.settledAt},provider_payment_id=${payment.paymentId}
    WHERE id=${chargeId}::uuid AND status='PENDING'
  `;
  await tx.$executeRaw`
    INSERT INTO platform_entitlements(tenant_id,state,paid_through,updated_at)
    VALUES(${charge.tenant_id}::uuid,'ACTIVE',${payment.settledAt} + (${months}::text || ' months')::interval,now())
    ON CONFLICT(tenant_id) DO UPDATE
    SET state='ACTIVE',grace_ends_at=NULL,
      paid_through=GREATEST(COALESCE(platform_entitlements.paid_through,${payment.settledAt}),${payment.settledAt})+
        (${months}::text || ' months')::interval,
      updated_at=now()
  `;
  await tx.$executeRaw`
    INSERT INTO platform_notification_outbox(tenant_id,channel,recipient,template_key,dedupe_key,payload)
    SELECT t.id,'EMAIL',t.owner_email,'payment_confirmed',${"paid:"+chargeId+":email"},${JSON.stringify({chargeId})}::jsonb
    FROM platform_tenants t WHERE t.id=${charge.tenant_id}::uuid
    ON CONFLICT(dedupe_key) DO NOTHING
  `;
  await queueOwnerInvitation(tx,charge.tenant_id,"PAID");
  return {status:"PAID" as const};
 });
}
