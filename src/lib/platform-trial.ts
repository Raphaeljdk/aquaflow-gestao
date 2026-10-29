/**
 * Período de teste: começa somente após provisionamento e autorização da empresa.
 * Solicitar cadastro/aprovação comercial NÃO equivale a iniciar o teste.
 */
export const TRIAL_DAYS = 7;
export const TRIAL_MILLISECONDS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
export type TrialState = "SOLICITADO" | "AGUARDANDO_ATIVACAO" | "ATIVO" | "EXPIRADO" | "NAO_APLICAVEL";

export function calculateTrialWindow(activationAt: Date) {
  if (Number.isNaN(activationAt.getTime())) throw new Error("Data de ativação inválida.");
  return { startedAt: new Date(activationAt), expiresAt: new Date(activationAt.getTime() + TRIAL_MILLISECONDS) };
}

export function getTrialState(record: {
  modalidadeCadastro: string;
  status: string;
  testeIniciadoEm: Date | string | null;
  testeExpiraEm: Date | string | null;
}, now = new Date()): TrialState {
  if (record.modalidadeCadastro !== "TESTE_7_DIAS") return "NAO_APLICAVEL";
  if (!record.testeIniciadoEm || !record.testeExpiraEm) {
    return record.status === "APROVADO" ? "AGUARDANDO_ATIVACAO" : "SOLICITADO";
  }
  const expires = new Date(record.testeExpiraEm);
  if (Number.isNaN(expires.getTime())) return "AGUARDANDO_ATIVACAO";
  return now.getTime() >= expires.getTime() ? "EXPIRADO" : "ATIVO";
}
