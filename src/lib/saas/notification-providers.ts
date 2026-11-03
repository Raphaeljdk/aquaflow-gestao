import "server-only";
import {ResendDeliveryError,resendFailureCategory,requireValidResendSender} from "./resend-diagnostics";
/** Never deliver before verified, configured providers are available. */
export function notificationsConfigured(){
 return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL);
}
export type Notification = {
  id:string;
  channel:"EMAIL"|"WHATSAPP";
  recipient:string;
  template_key:string;
  payload?:{state?:string};
};
export async function deliverNotification(message:Notification):Promise<string> {
 const isReady=message.template_key==="tenant_ready";
 const name=isReady?"Seu ambiente está pronto":message.template_key==="payment_confirmed"?"Pagamento confirmado":"Atualização da assinatura";
 if(message.channel==="EMAIL") {
  const apiKey=process.env.RESEND_API_KEY,from=process.env.NOTIFICATION_FROM_EMAIL;
  if(!apiKey||!from)throw new ResendDeliveryError("not_configured");
  const sender=requireValidResendSender(from);
  const r=await fetch("https://api.resend.com/emails",{
    method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json","Idempotency-Key":"ducha-notice-"+message.id},
    body:JSON.stringify({from:sender,to:[message.recipient],subject:"Ducha Elitte | "+name,
      text:isReady?"Seu banco de dados exclusivo foi preparado e seu teste gratuito de 7 dias já começou. Acesse https://www.duchaelitte.com.br/login com o e-mail e a senha que você criou.\n\nSe não reconhece este cadastro, procure o suporte.":
        "Existe uma atualização sobre sua assinatura do Ducha Elitte. Acesse o painel oficial da plataforma para consultar o status. Nenhuma senha é solicitada nesta mensagem."})
  });
  if(!r.ok)throw new ResendDeliveryError(resendFailureCategory(r.status),r.status);
  const j=await r.json() as {id?:string};
  if(!j.id)throw new ResendDeliveryError("provider_no_id");
  return j.id;
 }
 const token=process.env.WHATSAPP_BUSINESS_TOKEN;
 const phoneId=process.env.WHATSAPP_PHONE_ID;
 const version=process.env.WHATSAPP_GRAPH_VERSION;
 const template=process.env.WHATSAPP_TEMPLATE_LICENSE_STATUS;
 if(!token||!phoneId||!version||!template||
   !/^v\d+\.\d+$/.test(version)|| !/^\d+$/.test(phoneId)||
   !/^[a-z0-9_]{3,100}$/.test(template))throw new Error("Canal WhatsApp não homologado.");
 if(!/^55\d{10,11}$/.test(message.recipient.replace(/\D/g,"")))
   throw new Error("WhatsApp de destino inválido.");
 const response=await fetch("https://graph.facebook.com/"+version+"/"+phoneId+"/messages",{
   method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
   body:JSON.stringify({messaging_product:"whatsapp",to:message.recipient.replace(/\D/g,""),
     type:"template",template:{name:template,language:{code:"pt_BR"}}}),
 });
 if(!response.ok)throw new Error("WhatsApp oficial não confirmou a mensagem.");
 const j=await response.json() as {messages?:Array<{id?:string}>};
 if(!j.messages?.[0]?.id)throw new Error("Resposta do WhatsApp inválida.");
 return j.messages[0].id;
}
