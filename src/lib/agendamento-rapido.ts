import { z } from "zod";

export const agendamentoRapidoSchema = z.object({
  nomeCliente: z.string().trim().min(2, "Informe o nome de quem deseja agendar.").max(120),
  telefoneCliente: z.string().trim().transform(v=>v.replace(/[^0-9]/g, ""))
    .pipe(z.string().regex(/^(?:55)?[1-9][0-9]{9,10}$/, "Informe um WhatsApp com DDD.")),
  dataHora: z.string().datetime({offset:true}),
  servicoIds: z.array(z.string().min(1)).min(1,"Escolha pelo menos um serviço.").max(20),
  observacoes: z.string().trim().max(1000).default(""),
});
