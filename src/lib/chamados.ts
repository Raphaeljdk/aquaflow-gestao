import { z } from "zod";

export const novoChamadoSchema = z.object({
  titulo: z.string().trim().min(6, "Informe um título de pelo menos 6 caracteres.").max(120),
  categoria: z.enum(["ERRO", "DUVIDA", "MELHORIA", "FINANCEIRO", "OUTRO"]),
  prioridade: z.enum(["NORMAL", "ALTA"]).default("NORMAL"),
  descricao: z.string().trim().min(15, "Explique o problema com pelo menos 15 caracteres.").max(2500),
});
export const mensagemChamadoSchema = z.object({
  texto: z.string().trim().min(2).max(2500),
});
export const alterarChamadoSchema = z.object({
  status: z.enum(["ABERTO", "EM_ATENDIMENTO", "AGUARDANDO_CLIENTE", "RESOLVIDO", "FECHADO"]).optional(),
  resposta: z.string().trim().max(2500).optional(),
}).refine(v=>Boolean(v.status || v.resposta?.length), "Informe uma resposta ou mudança de status.");

export const statusChamadoLabels = {
  ABERTO: "Aberto",
  EM_ATENDIMENTO: "Em atendimento",
  AGUARDANDO_CLIENTE: "Aguardando cliente",
  RESOLVIDO: "Resolvido",
  FECHADO: "Fechado",
} as const;
export const categoriaChamadoLabels = {
  ERRO: "Problema no sistema",
  DUVIDA: "Dúvida",
  MELHORIA: "Sugestão de melhoria",
  FINANCEIRO: "Financeiro",
  OUTRO: "Outro assunto",
} as const;
