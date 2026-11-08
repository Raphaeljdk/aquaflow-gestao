import type { Prisma } from "@prisma/client";
import type { Comanda } from "@/types";

/**
 * Transforma o snapshot de uma comanda em campos escalares aceitos pelo Prisma.
 * O snapshot inclui relações como envioWhatsApp, usadas apenas para exibição:
 * não podem ser enviadas diretamente no `data` de `comanda.update()`.
 *
 * Também evita sobrescrever consentimento e estado do envio de WhatsApp,
 * que são geridos por endpoints próprios.
 */
export function dadosComandaParaPrisma(o: Comanda) {
  return {
    numero: o.numero,
    clienteId: o.clienteId,
    veiculoId: o.veiculoId,
    status: o.status,
    total: o.total,
    desconto: o.desconto,
    formaPagamento: o.formaPagamento,
    observacoes: o.observacoes,
    funcionarioId: o.funcionarioId,
    comissao: o.comissao,
    comissaoPercentual: o.comissaoPercentual,
    createdAt: new Date(o.createdAt),
    finalizadoEm: o.finalizadoEm ? new Date(o.finalizadoEm) : null,
    pagoEm: o.pagoEm ? new Date(o.pagoEm) : null,
    ...(o.vistoria
      ? { vistoria: o.vistoria as unknown as Prisma.InputJsonValue }
      : {}),
  };
}
