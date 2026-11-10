import type { Prisma } from "@prisma/client";

/**
 * Exclusivamente solicitações legadas descartáveis de TESTE, sem início
 * de licença e sem aprovação. Nunca toca em empresas ativadas, Neon,
 * Stripe, identidades, convites, movimentações financeiras ou comandas.
 */
export const criteriosSolicitacoesTesteDescartaveis: Prisma.SolicitacaoEmpresaWhereInput = {
  modalidadeCadastro: "TESTE_7_DIAS",
  status: { in: ["PENDENTE", "REJEITADO"] },
  testeIniciadoEm: null,
  testeExpiraEm: null,
  revisadoEm: null,
};
