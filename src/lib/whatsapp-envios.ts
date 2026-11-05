import "server-only";
import type { PrismaClient } from "@prisma/client";
import { gerarPdfComandaOperacional } from "@/lib/comanda-documento";
import { metadataEnvioComanda, versionGraphApi, whatsappGatewayReady } from "@/lib/whatsapp-oficial";

/** Somente a Meta Business Platform. Nunca tentar automatizar o WhatsApp Web. */
export async function processarProximaComandaWhatsapp(db:PrismaClient) {
  if(!whatsappGatewayReady())return {status:"DISABLED" as const};
  // Um processo interrompido nunca vira reenvio automático.
  await db.whatsAppEnvio.updateMany({
    where:{status:"PROCESSING",ultimaTentativaEm:{lt:new Date(Date.now()-15*60*1000)}},
    data:{status:"UNKNOWN",erroCodigo:"SEND_OUTCOME_UNCERTAIN"},
  });
  const job=await db.whatsAppEnvio.findFirst({
    where:{status:"PENDING"},
    orderBy:{criadoEm:"asc"},
    include:{comanda:{include:{cliente:true}}},
  });
  if(!job)return {status:"EMPTY" as const};
  const config=await db.configuracao.findUnique({where:{id:"empresa"}});
  const status=metadataEnvioComanda(
    job.comanda.cliente.telefone,job.comanda.whatsappAutorizadoEm,
    job.comanda.status,config?.whatsappEnvioAutomatico===true,
  );
  if(!status.allowed || !status.number){
    await db.whatsAppEnvio.updateMany({where:{id:job.id,status:"PENDING"},
      data:{status:"CANCELED",erroCodigo:status.reason}});
    return {status:"CANCELED" as const};
  }
  // Claim atômico impede dois workers do mesmo tenant de enviarem simultaneamente.
  const claim=await db.whatsAppEnvio.updateMany({
    where:{id:job.id,status:"PENDING"},
    data:{status:"PROCESSING",tentativas:{increment:1},ultimaTentativaEm:new Date()},
  });
  if(claim.count!==1)return {status:"SKIPPED" as const};
  const token=process.env.WHATSAPP_CLOUD_API_TOKEN!;
  const sender=process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const template=process.env.WHATSAPP_COMANDA_TEMPLATE_NAME!;
  const url="https://graph.facebook.com/"+versionGraphApi()+"/"+sender;
  let stage:"PDF"|"UPLOAD"|"SEND"="PDF";
  try{
    const pdf=await gerarPdfComandaOperacional(db,job.comandaId);
    if(pdf.size>10*1024*1024)throw new Error("PDF_SIZE");
    stage="UPLOAD";
    const form=new FormData();
    form.append("messaging_product","whatsapp");
    form.append("type","application/pdf");
    form.append("file",new Blob([await pdf.arrayBuffer()],{type:"application/pdf"}),pdf.name);
    const uploaded=await fetch(url+"/media",{
      method:"POST",headers:{Authorization:"Bearer "+token},body:form,
      signal:AbortSignal.timeout(20000),cache:"no-store",
    });
    if(!uploaded.ok)throw new Error("UPLOAD_HTTP_"+uploaded.status);
    const media=await uploaded.json() as {id?:string};
    if(!media.id||!/^\d{5,40}$/.test(media.id))throw new Error("UPLOAD_INVALID");
    stage="SEND";
    // Template de utilidade aprovado, com cabeçalho DOCUMENT e corpo estático.
    // Não pressupor janela de 24h aberta; fora dela texto livre seria proibido.
    const response=await fetch(url+"/messages",{
      method:"POST",
      headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
      body:JSON.stringify({
        messaging_product:"whatsapp",to:status.number,type:"template",
        template:{name:template,language:{code:"pt_BR"},components:[{
          type:"header",parameters:[{type:"document",document:{
            id:media.id,filename:pdf.name,
          }}],
        }]},
      }),
      signal:AbortSignal.timeout(20000),cache:"no-store",
    });
    if(!response.ok)throw new Error("SEND_HTTP_"+response.status);
    const sent=await response.json() as {messages?:Array<{id?:string}>};
    const messageId=sent.messages?.[0]?.id;
    if(!messageId||messageId.length>256)throw new Error("SEND_RESPONSE_UNKNOWN");
    await db.whatsAppEnvio.update({where:{id:job.id},data:{
      status:"SUBMITTED",providerMessageId:messageId,enviadoEm:new Date(),erroCodigo:"",
    }});
    return {status:"SUBMITTED" as const};
  }catch(error){
    const code=error instanceof Error?error.message:"UNKNOWN";
    // Após tentar o envio o resultado pode ser ambíguo (timeout). NÃO reenviar
    // automaticamente; isso causaria PDFs duplicados ao destinatário.
    const acceptedFailure=/^(UPLOAD_HTTP|SEND_HTTP)_\d{3}$/.test(code);
    const permanent=stage==="SEND"&&!acceptedFailure;
    const reason=acceptedFailure?code:
      code==="PDF_SIZE"?"PDF_TOO_LARGE":
      permanent?"SEND_UNCERTAIN":"PREPARATION_FAILED";
    await db.whatsAppEnvio.update({
      where:{id:job.id},
      data:{status:permanent?"UNKNOWN":"FAILED",erroCodigo:reason},
    });
    return {status:permanent?"UNKNOWN" as const:"FAILED" as const,reason};
  }
}
