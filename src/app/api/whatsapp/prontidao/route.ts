import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { whatsappGatewayReady } from "@/lib/whatsapp-oficial";
export const dynamic="force-dynamic";
export async function GET(){
  try{
    const user=await currentUser();
    if(user.platformOperator)return NextResponse.json({habilitado:false},{status:403});
    return NextResponse.json({habilitado:whatsappGatewayReady(),descricao:"Credenciais da Meta configuradas; a aprovação do modelo deve ser verificada na Meta."},
      {headers:{"Cache-Control":"no-store"}});
  }catch(e){return apiError(e)}
}
