import "server-only";
import {decryptInvitationLink} from "./secure-owner-invites";
import {ResendDeliveryError,resendFailureCategory,requireValidResendSender} from "./resend-diagnostics";
export type OwnerInviteNotice={id:string;channel:"EMAIL"|"WHATSAPP";recipient:string;payload?:{encryptedUrl?:string;reason?:string}};
export function ownerInviteChannelReady(channel:"EMAIL"|"WHATSAPP") {
 if(channel==="EMAIL")return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL);
 return Boolean(process.env.WHATSAPP_BUSINESS_TOKEN && process.env.WHATSAPP_PHONE_ID &&
  process.env.WHATSAPP_GRAPH_VERSION && process.env.WHATSAPP_TEMPLATE_OWNER_INVITE);
}
export async function deliverOwnerInvite(n:OwnerInviteNotice):Promise<string>{
 if(!ownerInviteChannelReady(n.channel))throw new Error("Canal de convite indisponível.");
 const url=decryptInvitationLink(n.payload?.encryptedUrl??"");
 const isSignup=n.payload?.reason==="SIGNUP";
 // The only HTML interpolation is a validated, decrypted official HTTPS invite URL.
 const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head>
 <body style="margin:0;padding:32px 16px;background:#090909;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif">
 <main style="max-width:530px;margin:auto;padding:32px;border:1px solid #313131;border-radius:18px;background:#151515">
 <p style="font-size:12px;letter-spacing:2px;font-weight:bold;color:#facc15">DUCHA ELITTE</p>
 <h1 style="font-size:26px;line-height:1.25;color:#fff">Crie sua senha de acesso</h1>
 <p style="font-size:15px;line-height:1.7;color:#d4d4d4">${isSignup?
   "Recebemos seu cadastro! Confirme seu e-mail criando sua senha. Depois disso, vamos preparar automaticamente o banco exclusivo do seu lava-rápido.":
   "Seu ambiente está pronto. Defina uma senha segura para começar a usar o sistema."}</p>
 <p style="margin:30px 0"><a href="${url}" style="display:inline-block;padding:15px 26px;border-radius:10px;background:#facc15;color:#111;font-size:15px;text-decoration:none;font-weight:bold">Criar minha senha</a></p>
 <p style="font-size:13px;line-height:1.6;color:#a3a3a3">Este link é individual e válido por 48 horas. O teste grátis só começa quando o ambiente estiver pronto. Nenhuma cobrança é feita nesta etapa.</p>
 <hr style="border:0;border-top:1px solid #333;margin:24px 0">
 <p style="font-size:12px;line-height:1.6;color:#888">Se você não fez este cadastro, ignore esta mensagem.</p>
 </main></body></html>`;
 if(n.channel==="EMAIL"){
  const sender=requireValidResendSender(process.env.NOTIFICATION_FROM_EMAIL);
  const response=await fetch("https://api.resend.com/emails",{
   method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json","Idempotency-Key":"ducha-owner-"+n.id},
   body:JSON.stringify({
    from:sender,to:[n.recipient],html,
    subject:"Ducha Elitte | Crie sua senha de acesso",
    text:n.payload?.reason==="SIGNUP" ?
      "Recebemos seu cadastro na Ducha Elitte. Confirme seu e-mail e crie sua senha pelo link seguro (válido por 48 horas):\n"+url+
      "\n\nDepois disso, seu banco exclusivo será preparado automaticamente. O teste grátis só começa quando ele estiver pronto. Não há cobrança nesta etapa.\n\nSe não foi você, ignore este e-mail." :
      "Seu ambiente Ducha Elitte está pronto. Use o link seguro para criar sua senha em até 48 horas:\n"+url+
      "\n\nSe você não reconhece essa solicitação, ignore este e-mail."
   }),signal:AbortSignal.timeout(12000)
  });
  if(!response.ok)throw new ResendDeliveryError(resendFailureCategory(response.status),response.status);
  const data=await response.json() as {id?:string};
  if(!data.id)throw new ResendDeliveryError("provider_no_id");
  return data.id;
 }
 const version=process.env.WHATSAPP_GRAPH_VERSION!,phoneId=process.env.WHATSAPP_PHONE_ID!,
 template=process.env.WHATSAPP_TEMPLATE_OWNER_INVITE!;
 if(!/^v\d+\.\d+$/.test(version)||!/^\d+$/.test(phoneId)||
    !/^[a-z0-9_]{3,100}$/.test(template)||!/^55\d{10,11}$/.test(n.recipient.replace(/\D/g,"")))
  throw new Error("WhatsApp de convite inválido.");
 const response=await fetch("https://graph.facebook.com/"+version+"/"+phoneId+"/messages",{
  method:"POST",headers:{"Authorization":"Bearer "+process.env.WHATSAPP_BUSINESS_TOKEN,"Content-Type":"application/json"},
  body:JSON.stringify({messaging_product:"whatsapp",to:n.recipient.replace(/\D/g,""),
   type:"template",template:{name:template,language:{code:"pt_BR"},
    components:[{type:"body",parameters:[{type:"text",text:url}]}]}}),
  signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)throw new Error("Falha ao enviar convite pelo WhatsApp.");
 const data=await response.json() as {messages?:Array<{id?:string}>};
 if(!data.messages?.[0]?.id)throw new Error("Envio de WhatsApp não confirmado.");
 return data.messages[0].id;
}
