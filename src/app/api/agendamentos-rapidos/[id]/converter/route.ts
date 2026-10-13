import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { checkOrigin, apiError } from "@/lib/api";
import { BusinessError } from "@/lib/domain";
import { canWrite } from "@/lib/permissions";
import { dayKey } from "@/lib/format";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest, {params}:{params:Promise<{id:string}>}) {
  try {
    const actor=await currentUser();
    if(!canWrite(actor.role,"agendamentos") || !canWrite(actor.role,"comandas"))
      throw new BusinessError("Acesso negado.",403);
    checkOrigin(request);
    const {id}=await params;
    const result=await prisma.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(642019)`;
      const booking=await tx.agendamento.findUnique({
        where:{id},include:{servicos:{include:{servico:true}}},
      });
      if(!booking || booking.status!=="AGENDADO" || booking.clienteId || booking.veiculoId)
        throw new BusinessError("Agendamento inválido ou já convertido.",409);
      if(dayKey(booking.dataHora)!==dayKey(new Date()))
        throw new BusinessError("Converta no dia do agendamento.");
      const subtotal=booking.servicos.reduce((sum,item)=>sum+Math.round(Number(item.servico.preco)*100),0);
      const order=await tx.comanda.create({
        data:{
          clienteId:null,veiculoId:null,
          nomeCliente:booking.nomeCliente,
          telefoneCliente:booking.telefoneCliente,
          placa:booking.placa,
          tipoVeiculo:booking.tipoVeiculo,
          total:new Prisma.Decimal(subtotal).div(100),desconto:0,
          observacoes:booking.observacoes,
          itens:{create:booking.servicos.map(item=>({
            servicoId:item.servicoId,nome:item.servico.nome,preco:item.servico.preco,quantidade:1,
          }))},
        },select:{id:true,numero:true},
      });
      await tx.agendamento.update({
        where:{id},data:{
          status:"CONVERTIDO",comandaId:order.id,
          nomeCliente:"",telefoneCliente:"",placa:"",
        },
      });
      return order;
    },{timeout:30000});
    return NextResponse.json({comanda:result});
  }catch(error){return apiError(error);}
}
