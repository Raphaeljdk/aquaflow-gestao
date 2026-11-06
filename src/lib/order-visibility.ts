import type { Status } from "@/types";

// "Finalizado" significa lavagem concluída: fora da fila operacional,
// mas permanece no histórico e pode ser posteriormente marcado como entregue.
export const estadosFilaOperacional: readonly Status[] = ["AGUARDANDO", "EM_LAVAGEM"];

export function apareceNaFilaOperacional(status: Status): boolean {
  return estadosFilaOperacional.includes(status);
}
