import { z } from "zod";

const placa = z.string().trim()
  .transform((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
  .pipe(z.string().regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, "Placa inválida. Use ABC1D23 ou ABC1234."));

export const atendimentoRapidoSchema = z.object({
  nomeCliente: z.string().trim().max(120)
    .refine((v) => !v || v.length >= 2, "Se informar o nome, use pelo menos 2 letras.")
    .optional().default(""),
  telefoneCliente: z.string().trim().optional().default("")
    .transform((v) => v.replace(/[^0-9]/g, ""))
    .refine((v) => !v || /^(?:55)?[1-9][0-9]{9,10}$/.test(v),
      "Informe um celular com DDD ou deixe em branco para cliente de passagem."),
  placa,
  tipo: z.enum(["CARRO", "MOTO", "CAMINHONETE"]),
  servicoIds: z.array(z.string().min(1)).min(1, "Selecione pelo menos um serviço.").max(20),
  funcionarioId: z.string().trim().optional().default(""),
  desconto: z.coerce.number().finite().min(0).max(100000).default(0),
  observacoes: z.string().trim().max(1000).default(""),
});

// Complementar a identificação não cria cadastro permanente antes da entrega.
export const contatoComandaSchema = atendimentoRapidoSchema.pick({
  nomeCliente: true,
  telefoneCliente: true,
});
