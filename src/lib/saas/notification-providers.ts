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
 const trialOffer=message.template_key==="trial_to_paid_offer";
 const name=trialOffer?"Seu teste terminou. Deseja continuar?":
   isReady?"Seu ambiente está pronto":
   message.template_key==="payment_confirmed"?"Pagamento confirmado":"Atualização da assinatura";
 if(message.channel==="EMAIL") {
  const apiKey=process.env.RESEND_API_KEY,from=process.env.NOTIFICATION_FROM_EMAIL;
  if(!apiKey||!from)throw new ResendDeliveryError("not_configured");
  const sender=requireValidResendSender(from);
  const r=await fetch("https://api.resend.com/emails",{
    method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json","Idempotency-Key":"ducha-notice-"+message.id},
    body:JSON.stringify({from:sender,to:[message.recipient],subject:"Ducha Elitte | "+name,
      text:trialOffer?
        "Seu período gratuito de 7 dias na Ducha Elitte terminou. Você gostaria de continuar usando seu lava-rápido?\n\nEscolha seu plano, sem contratação automática:\n• Mensal: R$ 80 por mês.\n• Anual em 12 mensalidades: R$ 960 no total (12 x R$ 80).\n• Anual à vista: R$ 790 em Pix, quando disponível, ou cartão de crédito em uma vez.\n\nAcesse https://www.duchaelitte.com.br/assinatura, informe o e-mail do proprietário para solicitar o link seguro e escolha como pagar na Stripe, assim que o checkout estiver habilitado. O acesso fica suspenso até o pagamento confirmado; os dados do seu estabelecimento são preservados. Se não desejar continuar, não precisa responder. Nenhuma cobrança é feita automaticamente. Em caso de dúvidas, entre em contato com gestaoduchaelitte@gmail.com.":
        isReady?"Seu banco de dados exclusivo foi preparado e seu teste gratuito de 7 dias já começou. Acesse https://www.duchaelitte.com.br/login com o e-mail e a senha que você criou.\n\nSe não reconhece este cadastro, procure o suporte.":
        "Existe uma atualização sobre sua assinatura do Ducha Elitte. Acesse o painel oficial da plataforma para consultar o status. Nenhuma senha é solicitada nesta mensagem.",
      ...(trialOffer?{html:`<main style="max-width:560px;margin:auto;font-family:Arial,Helvetica,sans-serif;background:#111;color:#f4f4f4;padding:30px;border-radius:18px"><p style="font-size:12px;color:#facc15;letter-spacing:2px;font-weight:bold">DUCHA ELITTE</p><h1 style="line-height:1.2">Seus 7 dias gratuitos terminaram.</h1><p>Quer continuar administrando seu lava-rápido com a Ducha Elitte?</p><ul style="line-height:2"><li>Mensal — <strong>R$ 80/mês</strong></li><li>Anual em 12 mensalidades — <strong>12 × R$ 80</strong> (total R$ 960)</li><li>Anual à vista — <strong>R$ 790</strong> (Pix, se disponível, ou cartão em 1x)</li></ul><p style="margin:30px 0"><a href="https://www.duchaelitte.com.br/assinatura" style="background:#facc15;color:#111;font-weight:bold;padding:15px 20px;border-radius:10px;text-decoration:none">Conhecer planos e continuar</a></p><p>Na página de planos, informe o e-mail do proprietário para receber um link individual e pagar com segurança na Stripe. Se o checkout ainda estiver em homologação, contate <a href="mailto:gestaoduchaelitte@gmail.com" style="color:#fde68a">gestaoduchaelitte@gmail.com</a>.</p><p style="font-size:13px;color:#aaa">Seu acesso permanece restrito até confirmação de pagamento. Seus dados estão preservados. Nenhuma cobrança é efetuada automaticamente. Se não quiser continuar, basta ignorar este e-mail.</p></main>`}: {})
    })
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
