import { z } from "zod";

export const solicitacaoEmpresaSchema = z.object({
  nomeEmpresa: z.string().trim().min(3).max(120),
  nomeResponsavel: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(150).transform((s) => s.toLowerCase()),
  whatsapp: z.string().transform((s) => s.replace(/[^0-9]/g, "")).refine((s) => /^(?:55)?[1-9][0-9]{9,10}$/.test(s), "Informe WhatsApp com DDD."),
  cidade: z.string().trim().min(2).max(120),
  mensagem: z.string().trim().max(500).default(""),
  aceitePrivacidade: z.literal(true),
  site: z.string().max(100).default(""),
});
export const decisaoSolicitacaoSchema = z.object({
  status: z.enum(["EM_ANALISE", "APROVADO", "REJEITADO"]),
  observacoesInternas: z.string().trim().max(1000).default(""),
});
