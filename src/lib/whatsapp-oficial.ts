import { normalizeWhatsappPhone } from "@/lib/whatsapp";
/** Gateway oficial Meta; nunca usar automação de WhatsApp Web nem expor token no navegador. */
export function whatsappGatewayReady(env:NodeJS.ProcessEnv=process.env):boolean {
  return env.WHATSAPP_COMANDA_ENABLED==="true" &&
    !!env.WHATSAPP_CLOUD_API_TOKEN?.trim() &&
    /^[0-9]{8,30}$/.test(env.WHATSAPP_PHONE_NUMBER_ID??"") &&
    /^[a-z][a-z0-9_]{2,100}$/.test(env.WHATSAPP_COMANDA_TEMPLATE_NAME??"");
}
export function metadataEnvioComanda(phone:string|null|undefined, consent:Date|null|undefined,
  status:string, auto:boolean){
  const number=normalizeWhatsappPhone(phone);
  return {allowed:!!number && !!consent && (status==="FINALIZADO" || status==="ENTREGUE") && auto,
    number,reason:!number?"NUMERO_INVALIDO":!consent?"SEM_CONSENTIMENTO":
      !["FINALIZADO","ENTREGUE"].includes(status)?"COMANDA_NAO_FINALIZADA":!auto?"AUTOMACAO_DESATIVADA":"OK"};
}
export function mensagensAprovadas(status:string) {
  return status==="PENDING" || status==="FAILED";
}
export function versionGraphApi(env:NodeJS.ProcessEnv=process.env){
  const v=env.WHATSAPP_GRAPH_API_VERSION||"v24.0";
  if(!/^v[0-9]{1,2}\.[0-9]$/.test(v)) throw new Error("Versão WhatsApp Graph API inválida.");
  return v;
}
