import { z } from "zod";

const placa = z.string().trim()
  .transform((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
  .pipe(z.string().regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, "Placa inválida. Use ABC1D23 ou ABC1234."));

export const atendimentoRapidoSchema = z.object({
  nomeCliente: z.string().trim().min(2, "Informe o nome do cliente.").max(120),
  placa,
  tipo: z.enum(["CARRO", "MOTO", "CAMINHONETE"]),
  servicoIds: z.array(z.string().min(1)).min(1, "Selecione pelo menos um serviço.").max(20),
  funcionarioId: z.string().trim().optional().default(""),
  desconto: z.coerce.number().finite().min(0).max(100000).default(0),
  observacoes: z.string().trim().max(1000).default(""),
});
