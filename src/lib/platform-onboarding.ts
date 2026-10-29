import { z } from "zod";

export const solicitacaoEmpresaSchema = z.object({
  nomeEmpresa: z.string().trim().min(3).max(120),
  cnpj: z.string().trim().max(18).default(""),
  razaoSocial: z.string().trim().max(200).default(""),
  nomeResponsavel: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(150).transform((s) => s.toLowerCase()),
  whatsapp: z.string().transform((s) => s.replace(/[^0-9]/g, "")).refine((s) => /^(?:55)?[1-9][0-9]{9,10}$/.test(s), "Informe WhatsApp com DDD."),
  cidade: z.string().trim().min(2).max(120),
  mensagem: z.string().trim().max(500).default(""),
  aceitePrivacidade: z.literal(true),
  cienteCondicoesComerciais: z.boolean().default(false),
  modalidadeCadastro: z.enum(["CONTRATACAO", "TESTE_7_DIAS"]).default("CONTRATACAO"),
  planoPagamento: z.enum(["ANUAL_MENSAL", "ANUAL_AVISTA"]).default("ANUAL_MENSAL"),
  metodoPagamento: z.enum(["CARTAO_DEBITO", "PIX_INTER", "CARTAO_CREDITO_1X"]).default("CARTAO_DEBITO"),
  site: z.string().max(100).default(""),
}).superRefine((data, context) => {
  if (data.modalidadeCadastro === "TESTE_7_DIAS") return;
  if (!data.cienteCondicoesComerciais) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["cienteCondicoesComerciais"], message: "Confirme as condições comerciais antes de contratar." });
  }
  const valido = data.planoPagamento === "ANUAL_MENSAL"
    ? data.metodoPagamento === "CARTAO_DEBITO"
    : data.metodoPagamento === "PIX_INTER" || data.metodoPagamento === "CARTAO_CREDITO_1X";
  if (!valido) context.addIssue({ code: z.ZodIssueCode.custom, path: ["metodoPagamento"], message: "Forma de pagamento indisponível para este plano." });
});
export const decisaoSolicitacaoSchema = z.object({
  status: z.enum(["EM_ANALISE", "APROVADO", "REJEITADO"]),
  observacoesInternas: z.string().trim().max(1000).default(""),
});
