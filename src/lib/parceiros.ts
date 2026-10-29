import { z } from "zod";
import { normalizeWhatsappPhone } from "@/lib/whatsapp";
import { cnpjValido } from "@/lib/cnpj-publico";

const phone = z.string().trim().max(35).transform(normalizeWhatsappPhone)
  .pipe(z.string({ required_error: "Informe o WhatsApp com DDD." }));
const short = (max = 200) => z.string().trim().max(max).default("");
const cnpj = z.string().trim().max(18)
  .refine(v => !v || cnpjValido(v), "CNPJ inválido. Confira os 14 dígitos.")
  .transform(v => v.replace(/\D/g, "")).default("");
export const parceiroSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome do lava-rápido.").max(120),
  cidade: short(120),
  whatsapp: phone,
  cnpj,
  razaoSocial: short(200),
  responsavel: short(120),
  endereco: short(300),
  cep: short(9).refine(v => !v || /^\d{8}$/.test(v.replace(/\D/g, "")), "CEP deve ter 8 dígitos."),
  bairro: short(120),
  uf: short(2).refine(v => !v || /^[A-Za-z]{2}$/.test(v), "UF inválida.").transform(v => v.toUpperCase()),
  email: short(150).refine(v => !v || z.string().email().safeParse(v).success, "E-mail inválido.")
    .transform(v => v.toLowerCase()),
  telefoneComercial: short(35),
  situacaoCadastral: short(50),
  atividadePrincipal: short(250),
  naturezaJuridica: short(150),
  porte: short(80),
  dataAbertura: short(10).refine(v => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data de abertura inválida."),
});
export const parceiroUpdateSchema = parceiroSchema.partial().extend({
  ativo: z.boolean().optional(),
}).refine((input) => Object.keys(input).length > 0, "Nenhuma alteração informada.");

export const pedidoAgendamentoSchema = z.object({
  parceiroId: z.string().trim().min(1).max(64),
  nome: z.string().trim().min(2).max(100),
  veiculo: z.string().trim().min(2).max(100),
  servico: z.string().trim().min(2).max(100),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  horario: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido."),
  observacoes: z.string().trim().max(400).default(""),
}).superRefine((input, ctx) => {
  const parsed = new Date(input.data + "T12:00:00Z");
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== input.data) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["data"], message: "Data inválida." });
  }
});

export function hojeEmSaoPaulo(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(at);
  const get = (name: string) => parts.find((part) => part.type === name)?.value ?? "";
  return get("year") + "-" + get("month") + "-" + get("day");
}

export function mensagemAgendamento(
  parceiro: { nome: string },
  pedido: z.infer<typeof pedidoAgendamentoSchema>,
): string {
  const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
  return [
    "Olá! Gostaria de solicitar um agendamento.",
    "",
    "Lava-rápido: " + oneLine(parceiro.nome),
    "Nome: " + oneLine(pedido.nome),
    "Veículo: " + oneLine(pedido.veiculo),
    "Serviço desejado: " + oneLine(pedido.servico),
    "Data desejada: " + pedido.data.split("-").reverse().join("/"),
    "Horário preferido: " + pedido.horario,
    pedido.observacoes ? "Observações: " + pedido.observacoes : "",
    "",
    "Vocês podem confirmar disponibilidade e valor, por favor?",
  ].filter(Boolean).join("\n");
}
