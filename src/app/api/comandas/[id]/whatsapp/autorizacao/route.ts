import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { checkOrigin, apiError } from "@/lib/api";
import { withOperationalDatabase } from "@/lib/saas/operations";
import { BusinessError } from "@/lib/domain";
import { normalizeWhatsappPhone } from "@/lib/whatsapp";
import { allowedPages } from "@/lib/permissions";
type Context = { params:Promise<{id:string}> };
export const runtime="nodejs";
export const dynamic="force-dynamic";
/** Registra consentimento confirmado pessoalmente pelo cliente. Não confundir com preencher o telefone. */
export async function POST(req:Request,context:Context) {
  try {
    checkOrigin(req);
    const user=await currentUser();
    if (!allowedPages[user.role].includes("comandas"))throw new BusinessError("Sem permissão.",403);
    const {id}=await context.params;
    const body=await req.json() as {confirmado?:boolean};
    if(body.confirmado!==true)throw new BusinessError("O cliente precisa autorizar expressamente o envio por WhatsApp.",400);
    const result=await withOperationalDatabase(user, db=>db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(642019)`;
      const order=await tx.comanda.findUnique({where:{id},include:{cliente:true}});
      if(!order)throw new BusinessError("Comanda não encontrada.",404);
      if(!["AGUARDANDO","EM_LAVAGEM"].includes(order.status))throw new BusinessError("Registre autorização antes de finalizar a comanda.",409);
      if(!normalizeWhatsappPhone(order.cliente.telefone))throw new BusinessError("Número de WhatsApp do cliente inválido.",400);
      const current=await tx.comanda.update({
        where:{id},data:{whatsappAutorizadoEm:new Date(),whatsappAutorizacaoPor:user.id},
      });
      await tx.whatsAppAutorizacaoEvento.create({
        data:{comandaId:id,registradoPorId:user.id,acao:"CONCEDEU",origem:"CONFIRMADO_PELO_CLIENTE"},
      });
      return current.whatsappAutorizadoEm?.toISOString()??null;
    }));
    return NextResponse.json({autorizadoEm:result},{headers:{"Cache-Control":"no-store"}});
  }catch(e){return apiError(e)}
}
/** Descadastro é permitido inclusive depois de finalizar; impedimos futuros envios. */
export async function DELETE(req:Request,context:Context){
  try{
    checkOrigin(req);
    const user=await currentUser();
    if(!allowedPages[user.role].includes("comandas"))throw new BusinessError("Sem permissão.",403);
    const {id}=await context.params;
    await withOperationalDatabase(user,db=>db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(642019)`;
      const order=await tx.comanda.findUnique({where:{id}});
      if(!order)throw new BusinessError("Comanda não encontrada.",404);
      await tx.comanda.update({where:{id},data:{whatsappAutorizadoEm:null}});
      await tx.whatsAppAutorizacaoEvento.create({
        data:{comandaId:id,registradoPorId:user.id,acao:"REVOGOU",origem:"SOLICITACAO_DO_CLIENTE"},
      });
      await tx.whatsAppEnvio.updateMany({
        where:{comandaId:id,status:{in:["PENDING","FAILED"]}},data:{status:"CANCELED",erroCodigo:"CONSENT_REVOKED"},
      });
    }));
    return NextResponse.json({ok:true,notice:"Envio futuro cancelado; mensagens já entregues não podem ser recolhidas."});
  }catch(e){return apiError(e)}
}
