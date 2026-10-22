import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkOrigin, apiError } from "@/lib/api";
import { BusinessError } from "@/lib/domain";
import { pedidoPublicoSchema, horarioPedido, horarioPermitido } from "@/lib/pedido-agendamento";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (Number(request.headers.get("content-length")||0)>6000)
      throw new BusinessError("Formulário muito grande.",413);
    const parsed = pedidoPublicoSchema.parse(await request.json());
    const [config,service] = await Promise.all([
      prisma.configuracao.findUnique({where:{id:"empresa"}}),
      prisma.servico.findFirst({where:{id:parsed.servicoId,ativo:true}}),
    ]);
    if (!config || !service) throw new BusinessError("Serviço indisponível.",409);
    const dataHora = horarioPedido(parsed.data,parsed.horario);
    if (!horarioPermitido(config,dataHora,service.duracaoMin))
      throw new BusinessError("Escolha um horário futuro dentro do expediente e da duração do serviço.",400);
    const salt = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!salt) throw new BusinessError("Serviço temporariamente indisponível.",503);
    const ip = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const origemHash = createHash("sha256").update(salt+":"+ip).digest("hex");
    const inicio = new Date(Date.now()-24*3600*1000);
    const [count,recent] = await Promise.all([
      prisma.pedidoAgendamentoPublico.count({where:{origemHash,createdAt:{gte:inicio}}}),
      prisma.pedidoAgendamentoPublico.findFirst({where:{
        nome:parsed.nome,placa:parsed.placa,dataHora,
        status:"PENDENTE",createdAt:{gte:new Date(Date.now()-5*60000)},
      },select:{id:true}}),
    ]);
    if(count>=3)throw new BusinessError("Limite de pedidos atingido. Entre em contato com o estabelecimento.",429);
    if(recent)throw new BusinessError("Já existe um pedido recente para este veículo e horário.",409);
    const registro = await prisma.pedidoAgendamentoPublico.create({data:{
      nome:parsed.nome,telefone:parsed.telefone,tipo:parsed.tipo,placa:parsed.placa,
      descricaoVeiculo:parsed.descricaoVeiculo,servicoId:parsed.servicoId,
      dataHora,observacoes:parsed.observacoes,origemHash,
    },select:{id:true}});
    return NextResponse.json({ok:true,id:registro.id,message:"Pedido recebido. A equipe deverá confirmar o agendamento."},{status:201,headers:{"Cache-Control":"no-store"}});
  }catch(error){
    if(error instanceof SyntaxError) return NextResponse.json({error:"Dados inválidos."},{status:400});
    return apiError(error);
  }
}
