import { z } from "zod";
import { fromLocal, dateLabel } from "@/lib/format";
import { normalizeWhatsappPhone } from "@/lib/whatsapp";

export const pedidoPublicoSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  telefone: z.string().trim().max(30).transform(normalizeWhatsappPhone)
    .pipe(z.string().regex(/^55\d{10,11}$/, "Informe WhatsApp com DDD.")),
  tipo: z.enum(["CARRO", "MOTO", "CAMINHONETE"]),
  placa: z.string().trim().transform((s) => s.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .pipe(z.string().regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, "Informe uma placa válida.")),
  descricaoVeiculo: z.string().trim().min(2).max(120),
  servicoId: z.string().trim().min(1).max(100),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horario: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  observacoes: z.string().trim().max(400).default(""),
  aceitePrivacidade: z.literal(true),
}).superRefine((v, ctx) => {
  const date = new Date(v.data + "T12:00:00Z");
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== v.data)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["data"], message: "Data inválida." });
});
export function horarioPedido(data: string, horario: string): Date {
  return new Date(fromLocal(data + "T" + horario));
}
export function horarioPermitido(config: {
  diasSemana: number[]; abertura: string; fechamento: string; intervaloMin: number;
}, inicio: Date, duracaoMin: number, now: Date = new Date()): boolean {
  const fim = new Date(inicio.getTime() + duracaoMin * 60000);
  const local = dateLabel(inicio,"HH:mm");
  const final = dateLabel(fim,"HH:mm");
  const dia = Number(dateLabel(inicio,"i"))%7;
  const minutes = (s: string) => Number(s.slice(0,2))*60 + Number(s.slice(3));
  return inicio > now &&
    inicio < new Date(now.getTime()+90*86400000) &&
    config.diasSemana.includes(dia) &&
    dateLabel(inicio,"yyyy-MM-dd") === dateLabel(fim,"yyyy-MM-dd") &&
    local >= config.abertura &&
    final <= config.fechamento &&
    (minutes(local)-minutes(config.abertura))%config.intervaloMin === 0;
}
