import "server-only";
import {decryptInvitationLink} from "./secure-owner-invites";
export type OwnerInviteNotice={channel:"EMAIL"|"WHATSAPP";recipient:string;payload?:{encryptedUrl?:string}};
export function ownerInviteChannelReady(channel:"EMAIL"|"WHATSAPP") {
 if(channel==="EMAIL")return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL);
 return Boolean(process.env.WHATSAPP_BUSINESS_TOKEN && process.env.WHATSAPP_PHONE_ID &&
  process.env.WHATSAPP_GRAPH_VERSION && process.env.WHATSAPP_TEMPLATE_OWNER_INVITE);
}
export async function deliverOwnerInvite(n:OwnerInviteNotice):Promise<string>{
 if(!ownerInviteChannelReady(n.channel))throw new Error("Canal de convite indisponível.");
 const url=decryptInvitationLink(n.payload?.encryptedUrl??"");
 if(n.channel==="EMAIL"){
  const response=await fetch("https://api.resend.com/emails",{
   method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},
   body:JSON.stringify({
    from:process.env.NOTIFICATION_FROM_EMAIL,to:[n.recipient],
    subject:"Ducha Elitte | Crie sua senha de acesso",
    text:"Seu ambiente Ducha Elitte está pronto. Use o link seguro para criar sua senha em até 48 horas:\n"+url+
    "\n\nSe você não reconhece essa contratação, ignore este e-mail."
   }),signal:AbortSignal.timeout(12000)
  });
  if(!response.ok)throw new Error("Falha ao enviar convite por e-mail.");
  const data=await response.json() as {id?:string};
  if(!data.id)throw new Error("Envio de e-mail não confirmado.");
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
