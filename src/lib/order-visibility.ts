import type { Status } from "@/types";

/**
 * Finalização da lavagem NÃO remove a comanda da fila.
 * Só a ação manual "Excluir" (registrada como ENTREGUE) a retira do quadro.
 * Comandas entregues, canceladas e todas as informações financeiras
 * continuam no banco e no histórico consultável.
 */
export const estadosFilaOperacional: readonly Status[] = [
  "AGUARDANDO",
  "EM_LAVAGEM",
  "FINALIZADO",
];

export function apareceNaFilaOperacional(status: Status): boolean {
  return estadosFilaOperacional.includes(status);
}
