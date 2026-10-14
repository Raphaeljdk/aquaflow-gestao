import { NextResponse } from "next/server";
import { operationalUser as currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrigin, apiError } from "@/lib/api";
import { BusinessError } from "@/lib/domain";
import { canWrite } from "@/lib/permissions";
import { dayKey, dateLabel } from "@/lib/format";
import { agendamentoRapidoSchema } from "@/lib/agendamento-rapido";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!canWrite(user, "agendamentos")) throw new BusinessError("Acesso negado.",403);
    checkOrigin(request);
    if (Number(request.headers.get("content-length") ?? 0) > 16000)
      throw new BusinessError("Requisição muito grande.",413);
    const values = agendamentoRapidoSchema.parse(await request.json());
    const created = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(642019)`;
      const [config, services] = await Promise.all([
        tx.configuracao.findUnique({where:{id:"empresa"}}),
        tx.servico.findMany({ where: { id:{in:values.servicoIds},ativo:true } }),
      ]);
      if (!config || services.length!==new Set(values.servicoIds).size)
        throw new BusinessError("Serviço ou configuração indisponível.",409);
      const start = new Date(values.dataHora);
      const duration = services.reduce((total,s)=>total+s.duracaoMin,0);
      const end = new Date(start.getTime()+duration*60000);
      if (start<=new Date() || dayKey(start)!==dayKey(end))
        throw new BusinessError("Escolha um horário futuro no mesmo dia.");
      if (start.getUTCSeconds()!==0 || start.getUTCMilliseconds()!==0)
        throw new BusinessError("Escolha um horário sem segundos.");
      const weekday=Number(dateLabel(start,"i"))%7;
      const localStart=dateLabel(start,"HH:mm"),localEnd=dateLabel(end,"HH:mm");
      const min=(h:string)=>Number(h.slice(0,2))*60+Number(h.slice(3));
      if (!config.diasSemana.includes(weekday) ||
          localStart<config.abertura || localEnd>config.fechamento ||
          (min(localStart)-min(config.abertura))%config.intervaloMin!==0)
        throw new BusinessError("Horário fora do funcionamento.");
      const collision = await tx.agendamento.findFirst({
        where: {status:"AGENDADO",dataHora:{lt:end},fim:{gt:start}},
      });
      if(collision)throw new BusinessError("Horário já reservado.",409);
      return tx.agendamento.create({
        data:{
          clienteId:null,veiculoId:null,
          nomeCliente:values.nomeCliente,
          telefoneCliente:values.telefoneCliente.length >= 12?values.telefoneCliente:"55"+values.telefoneCliente,
          dataHora:start,fim:end,
          observacoes:values.observacoes,
          servicos:{create:services.map(s=>({servicoId:s.id}))},
        },select:{id:true},
      });
    },{timeout:30000});
    return NextResponse.json({agendamento:created},{status:201});
  } catch(error) {
    if(error instanceof SyntaxError)
      return NextResponse.json({error:"JSON inválido."},{status:400});
    return apiError(error);
  }
}
