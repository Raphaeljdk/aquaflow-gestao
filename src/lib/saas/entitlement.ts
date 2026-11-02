/** Licensing is separate from operational data and from commercial approvals. */
export type LicenseState = "PENDING" | "TRIAL" | "ACTIVE" | "GRACE" | "SUSPENDED" | "EXPIRED";
export type ProvisionState = "PENDING" | "PROVISIONING" | "READY" | "SUSPENDED" | "ERROR";
export type Entitlement = Readonly<{
  state: LicenseState;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  paidThrough: Date | null;
  graceEndsAt: Date | null;
}>;
export const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function startTrial(license: Entitlement, ready: ProvisionState, now: Date): Entitlement {
  if (ready !== "READY") throw new Error("Acesso isolado não provisionado.");
  if (license.state !== "PENDING" || license.trialStartedAt || license.trialEndsAt) {
    throw new Error("Teste já usado ou não autorizado.");
  }
  if (!Number.isFinite(now.getTime())) throw new Error("Data inválida.");
  return {
    state: "TRIAL", trialStartedAt: new Date(now),
    trialEndsAt: new Date(now.getTime() + TRIAL_DURATION_MS),
    paidThrough: null, graceEndsAt: null,
  };
}

export function effectiveState(license: Entitlement, now: Date): LicenseState {
  const stamp = now.getTime();
  if (!Number.isFinite(stamp)) throw new Error("Data inválida.");
  if (license.state === "SUSPENDED") return "SUSPENDED";
  if (license.state === "TRIAL") {
    if (!license.trialEndsAt || !Number.isFinite(license.trialEndsAt.getTime())) return "EXPIRED";
    return stamp < license.trialEndsAt.getTime() ? "TRIAL" : "EXPIRED";
  }
  if (license.state === "ACTIVE" || license.state === "GRACE") {
    if (license.paidThrough && stamp < license.paidThrough.getTime()) return "ACTIVE";
    if (license.graceEndsAt && stamp < license.graceEndsAt.getTime()) return "GRACE";
    return "EXPIRED";
  }
  return license.state;
}

export function authorizeOperationalAccess(
  tenant: { id: string; state: ProvisionState },
  member: { tenantId: string; enabled: boolean } | null,
  license: Entitlement,
  now: Date,
): void {
  if (!member || !member.enabled || member.tenantId !== tenant.id)
    throw new LicenseAccessError("Sem vínculo com este estabelecimento.",403);
  if (tenant.state !== "READY")
    throw new LicenseAccessError("Ambiente ainda não provisionado.",503);
  const status = effectiveState(license,now);
  if (status !== "TRIAL" && status !== "ACTIVE" && status !== "GRACE")
    throw new LicenseAccessError("Licença inativa ou vencida.",423);
}

export class LicenseAccessError extends Error {
  constructor(message: string, public readonly status: 403|423|503){super(message);}
}

/** A settlement is accepted only after a server-side authenticated query to the provider. */
export type VerifiedSettlement = Readonly<{
  provider: "INTER_PIX" | "CARD_PROCESSOR";
  externalReference: string;
  paymentId: string;
  receivedCents: number;
  settledAt: Date;
  verifiedWithProvider: true;
}>;
export function assertSettlementMatchesCharge(
  charge: {provider:string; externalReference:string; expectedCents:number; status:string},
  payment: VerifiedSettlement,
) {
  if (payment.verifiedWithProvider !== true ||
      payment.provider !== charge.provider ||
      payment.externalReference !== charge.externalReference ||
      payment.receivedCents !== charge.expectedCents ||
      !payment.paymentId.trim() ||
      !Number.isFinite(payment.settledAt.getTime())) {
    throw new Error("Pagamento não conciliado com a cobrança.");
  }
  if (charge.status !== "PENDING" && charge.status !== "PAID")
    throw new Error("Cobrança cancelada ou indisponível.");
}
