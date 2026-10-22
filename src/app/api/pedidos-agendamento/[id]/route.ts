import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/api";
import { BusinessError } from "@/lib/domain";
import { canWrite } from "@/lib/permissions";
import { horarioPermitido } from "@/lib/pedido-agendamento";
import { normalizeWhatsappPhone } from "@/lib/whatsapp";

export const dynamic="force-dynamic";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await currentUser();
    if(!canWrite(user.role,"agendamentos"))throw new BusinessError("Sem permissão.",403);
    checkOrigin(request);
    const {id}=await params;
    const {acao}=z.object({acao:z.enum(["CONFIRMAR","RECUSAR"])}).parse(await request.json());
    const result=await prisma.$transaction(async(tx)=>{
      // Shared lock with normal appointment/command writes to prevent double booking.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(642019)`;
      const pedido=await tx.pedidoAgendamentoPublico.findUnique({where:{id}});
      if(!pedido)throw new BusinessError("Pedido não encontrado.",404);
      if(pedido.status!=="PENDENTE")throw new BusinessError("Este pedido já foi analisado.",409);
      if(acao==="RECUSAR"){
        await tx.pedidoAgendamentoPublico.update({where:{id},data:{status:"RECUSADO"}});
        return {status:"RECUSADO"};
      }
      const [config,servico]=await Promise.all([
        tx.configuracao.findUnique({where:{id:"empresa"}}),
        tx.servico.findFirst({where:{id:pedido.servicoId,ativo:true}}),
      ]);
      if(!config||!servico)throw new BusinessError("Serviço indisponível. Contate o cliente.",409);
      if(!horarioPermitido(config,pedido.dataHora,servico.duracaoMin))
        throw new BusinessError("O horário solicitado não está disponível no expediente.",409);
      const fim=new Date(pedido.dataHora.getTime()+servico.duracaoMin*60000);
      const conflito=await tx.agendamento.findFirst({where:{
        status:"AGENDADO",dataHora:{lt:fim},fim:{gt:pedido.dataHora},
      },select:{id:true}});
      if(conflito)throw new BusinessError("Horário ocupado. Combine outra data antes de confirmar.",409);
      const existente=await tx.veiculo.findUnique({where:{placa:pedido.placa},include:{cliente:true}});
      if(existente){
        const mesmoNome=existente.cliente.nome.trim().toLocaleLowerCase("pt-BR")===pedido.nome.trim().toLocaleLowerCase("pt-BR");
        const telefoneAnterior=normalizeWhatsappPhone(existente.cliente.telefone);
        if(!mesmoNome || (telefoneAnterior && telefoneAnterior!==pedido.telefone) || existente.tipo!==pedido.tipo)
          throw new BusinessError("Placa vinculada a outro cliente ou tipo. Confira os dados no cadastro antes de confirmar.",409);
      }
      const veiculo=existente??await tx.veiculo.create({data:{
        placa:pedido.placa,tipo:pedido.tipo,marca:"Não informado",
        modelo:pedido.descricaoVeiculo,cor:"Não informado",
        ano:new Date().getFullYear(),
        cliente:{create:{nome:pedido.nome,telefone:pedido.telefone}},
      }});
      if(existente && !existente.cliente.telefone)
        await tx.cliente.update({where:{id:existente.clienteId},data:{telefone:pedido.telefone}});
      const agendamento=await tx.agendamento.create({data:{
        clienteId:veiculo.clienteId,veiculoId:veiculo.id,
        dataHora:pedido.dataHora,fim,status:"AGENDADO",
        observacoes:["Origem: agendamento público",pedido.observacoes].filter(Boolean).join(" · "),
        servicos:{create:{servicoId:pedido.servicoId}},
      },select:{id:true}});
      await tx.pedidoAgendamentoPublico.update({where:{id},data:{
        status:"CONFIRMADO",agendamentoId:agendamento.id,
      }});
      return {status:"CONFIRMADO",agendamentoId:agendamento.id};
    },{timeout:30000});
    return NextResponse.json(result);
  }catch(error){
    if(error instanceof SyntaxError)return NextResponse.json({error:"Dados inválidos."},{status:400});
    return apiError(error);
  }
}
