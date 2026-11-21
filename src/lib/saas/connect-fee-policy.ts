/** Política de comissões para pagamentos operacionais Connect.
 * Não confundir com o faturamento das licenças SaaS da plataforma.
 * Este módulo não movimenta dinheiro; charges precisam ser executadas pela integração Connect.
 */
export type OperationalPaymentKind = "AVULSA" | "ASSINATURA_LAVARAPIDO";
export const CONNECT_SALE_FEE_CENTS = 100;
export const CONNECT_SUBSCRIPTION_INVOICE_FEE_CENTS = 200;
export type FeeAssessment = Readonly<{
  kind: OperationalPaymentKind;
  feeCents: number;
  amountCents: number;
  currency: "brl";
  eligible: boolean;
  reason: "ELIGIBLE" | "NOT_SETTLED" | "EXTERNAL_PAYMENT" | "UNCONNECTED_ACCOUNT" | "NON_POSITIVE_AMOUNT" | "AMOUNT_BELOW_FEE";
}>;
export function assessConnectFee(input: {
  kind: OperationalPaymentKind;
  amountCents: number;
  currency: "brl";
  paymentStatus: "paid" | "pending" | "failed" | "refunded";
  processedViaConnect: boolean;
  connectedAccountReady: boolean;
}): FeeAssessment {
  const feeCents = input.kind === "ASSINATURA_LAVARAPIDO"
    ? CONNECT_SUBSCRIPTION_INVOICE_FEE_CENTS : CONNECT_SALE_FEE_CENTS;
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0)
    return {kind:input.kind,feeCents:0,amountCents:input.amountCents,currency:input.currency,eligible:false,reason:"NON_POSITIVE_AMOUNT"};
  const reason = input.paymentStatus !== "paid" ? "NOT_SETTLED"
    : !input.processedViaConnect ? "EXTERNAL_PAYMENT"
    : !input.connectedAccountReady ? "UNCONNECTED_ACCOUNT"
    : input.amountCents < feeCents ? "AMOUNT_BELOW_FEE" : "ELIGIBLE";
  return {kind:input.kind,feeCents:reason === "ELIGIBLE" ? feeCents : 0,
    amountCents:input.amountCents,currency:input.currency,
    eligible:reason === "ELIGIBLE",reason};
}
/** Chave de conciliação: usar IDs verificados da Stripe, nunca IDs enviados pelo browser. */
export function connectFeeLedgerKey(tenantId:string, stripeAccountId:string, stripePaymentId:string) {
  if (!/^[0-9a-f-]{36}$/i.test(tenantId) || !/^acct_[A-Za-z0-9]+$/.test(stripeAccountId) ||
      !/^(pi_|in_)[A-Za-z0-9]+$/.test(stripePaymentId))
    throw new Error("Identificação Connect inválida.");
  return [tenantId,stripeAccountId,stripePaymentId].join(":");
}

/** Divisão comercial antes das tarifas do processador: o comprador paga o preço anunciado.
 * Somente cálculo de referência, não confirma disponibilidade nem executa transferência.
 */
export function calculateMerchantDeductedSplit(assessment: FeeAssessment) {
  if (!assessment.eligible || assessment.feeCents <= 0)
    throw new Error("Comissão não elegível para divisão.");
  return {
    customerPaysCents: assessment.amountCents,
    merchantBeforeProcessorFeesCents: assessment.amountCents - assessment.feeCents,
    platformFeeCents: assessment.feeCents,
    processorFeesIncluded: false as const,
  };
}
