/**
 * Contrato futuro dos adaptadores SmartPOS. NÃO contém cobrança real e não cria
 * estado financeiro: exige que um backend autenticado resolva tenant e credencial.
 * Nunca selecionar a conta recebedora usando parâmetros livres do dispositivo.
 */
export type PosProvider = "mercado_pago" | "stone" | "cielo" | "pagbank"
  | "getnet" | "rede" | "safrapay" | "vero";

export type ServerVerifiedMerchant = Readonly<{
  tenantId: string;
  actorId: string;
  merchantAccountRef: string;
}>;

export type VerifiedPosCharge = Readonly<{
  provider: PosProvider;
  merchant: ServerVerifiedMerchant;
  comandaId: string;
  amountCents: number;
  idempotencyKey: string;
}>;

export type PosChargeResult =
  | Readonly<{ status: "APPROVED"; transactionRef: string }>
  | Readonly<{ status: "PENDING"; transactionRef: string }>
  | Readonly<{ status: "CANCELLED" }>
  | Readonly<{ status: "DECLINED"; reason: string }>;

export interface PosPaymentAdapter {
  readonly provider: PosProvider;
  charge(verified: VerifiedPosCharge): Promise<PosChargeResult>;
  getTransaction(merchant: ServerVerifiedMerchant, transactionRef: string): Promise<PosChargeResult>;
}

/** Validação defensiva para futuras integrações com credenciais por estabelecimento. */
export function validateVerifiedPosCharge(input: VerifiedPosCharge): void {
  if (!input.merchant?.tenantId || !input.merchant.actorId || !input.merchant.merchantAccountRef)
    throw new Error("Sessão/conta recebedora não resolvida pelo backend.");
  if (!input.comandaId || !/^[a-zA-Z0-9_-]{8,128}$/.test(input.comandaId))
    throw new Error("Identificador de comanda inválido.");
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0)
    throw new Error("Valor em centavos inválido.");
  if (!/^[a-zA-Z0-9:_-]{16,128}$/.test(input.idempotencyKey))
    throw new Error("Chave de idempotência inválida.");
}

/**
 * Fail-closed: se o adaptador não estiver homologado, nenhuma cobrança ocorre.
 * Não transformar isto em aprovação simulada e nunca atualizar uma comanda daqui.
 */
export class UnavailablePosAdapter implements PosPaymentAdapter {
  constructor(readonly provider: PosProvider) {}

  async charge(input: VerifiedPosCharge): Promise<PosChargeResult> {
    validateVerifiedPosCharge(input);
    throw new Error("Pagamento SmartPOS indisponível: SDK e homologação pendentes.");
  }

  async getTransaction(): Promise<PosChargeResult> {
    throw new Error("Consulta SmartPOS indisponível: SDK e homologação pendentes.");
  }
}
