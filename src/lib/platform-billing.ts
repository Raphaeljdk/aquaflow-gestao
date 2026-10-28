/** Política comercial da assinatura anual Ducha Elitte.
 * Apenas a plataforma: não diz respeito às cobranças por lavagens.
 * Este módulo NÃO processa transações e NÃO libera acesso automaticamente.
 */
export const PLATFORM_MONTHLY_PRICE_CENTS = 8000;
export const PLATFORM_ANNUAL_STANDARD_CENTS = 96000;
export const PLATFORM_ANNUAL_UPFRONT_CENTS = 79000;
export const PLATFORM_ANNUAL_SAVINGS_CENTS = PLATFORM_ANNUAL_STANDARD_CENTS - PLATFORM_ANNUAL_UPFRONT_CENTS;
export const PLATFORM_ANNUAL_MONTHS = 12;
export const PLATFORM_MONTHLY_PRICE_LABEL = "R$ 80,00/mês";

export type PlatformPlan = "ANUAL_MENSAL" | "ANUAL_AVISTA";
export type PlatformPaymentMethod = "CARTAO_DEBITO" | "PIX_INTER" | "CARTAO_CREDITO_1X";

export function resolvePlatformOffer(plan: PlatformPlan, method: PlatformPaymentMethod) {
  if (plan === "ANUAL_MENSAL" && method === "CARTAO_DEBITO") {
    return {
      plan,
      method,
      totalCents: PLATFORM_ANNUAL_STANDARD_CENTS,
      installments: PLATFORM_ANNUAL_MONTHS,
      installmentCents: PLATFORM_MONTHLY_PRICE_CENTS,
    } as const;
  }
  if (plan === "ANUAL_AVISTA" && (method === "PIX_INTER" || method === "CARTAO_CREDITO_1X")) {
    return {
      plan,
      method,
      totalCents: PLATFORM_ANNUAL_UPFRONT_CENTS,
      installments: 1,
      installmentCents: PLATFORM_ANNUAL_UPFRONT_CENTS,
    } as const;
  }
  throw new Error("Combinação de plano e pagamento não permitida.");
}

export function formatPlatformPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
