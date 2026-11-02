import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { withOperationalDatabase } from "@/lib/saas/operations";
import { apiError } from "@/lib/api";
import { BusinessError } from "@/lib/domain";
import { allowedPages } from "@/lib/permissions";

export const dynamic="force-dynamic";
export async function GET(){
  try{
    const user=await currentUser();
    if(!allowedPages[user.role].includes("agendamentos"))throw new BusinessError("Sem permissão.",403);
    const pedidos=await withOperationalDatabase(user,db=>db.pedidoAgendamentoPublico.findMany({
      orderBy:{createdAt:"desc"},take:100,
      select:{id:true,nome:true,telefone:true,tipo:true,placa:true,descricaoVeiculo:true,
        servicoId:true,dataHora:true,observacoes:true,status:true,agendamentoId:true,createdAt:true},
    }));
    return NextResponse.json({pedidos},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return apiError(error)}
}
