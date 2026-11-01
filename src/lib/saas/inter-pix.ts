import "server-only";
import { request } from "node:https";
import type { VerifiedSettlement } from "./entitlement";

/** Inter Empresas Pix API (mTLS). The webhook alone never confirms a payment. */
const HOST="cdpj.partners.bancointer.com.br";
type Config={cert:Buffer;key:Buffer;clientId:string;clientSecret:string;pixKey:string;account:string};
function config():Config {
 const items=["INTER_CERT_PEM_BASE64","INTER_KEY_PEM_BASE64","INTER_CLIENT_ID","INTER_CLIENT_SECRET","INTER_PIX_KEY","INTER_ACCOUNT_NUMBER"];
 if(items.some(x=>!process.env[x]))throw new Error("Integração Inter ainda não habilitada.");
 const cert=Buffer.from(process.env.INTER_CERT_PEM_BASE64!,"base64");
 const key=Buffer.from(process.env.INTER_KEY_PEM_BASE64!,"base64");
 if(!cert.toString("utf8").includes("BEGIN CERTIFICATE") || !key.toString("utf8").includes("BEGIN"))
  throw new Error("Certificado da integração inválido.");
 return {cert,key,clientId:process.env.INTER_CLIENT_ID!,clientSecret:process.env.INTER_CLIENT_SECRET!,
         pixKey:process.env.INTER_PIX_KEY!,account:process.env.INTER_ACCOUNT_NUMBER!};
}
async function call(cfg:Config,method:"GET"|"PUT"|"POST",path:string,body?:string,token?:string) {
 if(!path.startsWith("/pix/v2/") && path!=="/oauth/v2/token") throw new Error("Caminho não autorizado.");
 const headers:Record<string,string>={"accept":"application/json","x-conta-corrente":cfg.account};
 if(body)headers["content-type"]=path==="/oauth/v2/token"?"application/x-www-form-urlencoded":"application/json";
 if(token)headers.authorization="Bearer "+token;
 return new Promise<{status:number,data:unknown}>((resolve,reject)=>{
   const req=request({hostname:HOST,port:443,method,path,cert:cfg.cert,key:cfg.key,
     rejectUnauthorized:true,timeout:10000,headers},res=>{
     let raw="";
     res.setEncoding("utf8");
     res.on("data",chunk=>{raw+=chunk; if(raw.length>100000){req.destroy();reject(new Error("Resposta Inter acima do limite."));}});
     res.on("end",()=>{
       try {resolve({status:res.statusCode??500,data:JSON.parse(raw)});}
       catch{reject(new Error("Resposta bancária inválida."));}
     });
   });
   req.on("timeout",()=>req.destroy(new Error("Tempo excedido ao consultar Inter.")));
   req.on("error",()=>reject(new Error("Não foi possível consultar a API Inter.")));
   if(body)req.write(body);
   req.end();
 });
}
async function token(cfg:Config) {
 const body=new URLSearchParams({client_id:cfg.clientId,client_secret:cfg.clientSecret,
  scope:"cob.read cob.write pix.read",grant_type:"client_credentials"}).toString();
 const result=await call(cfg,"POST","/oauth/v2/token",body);
 const response=result.data as {access_token?:string};
 if(result.status!==200 || !response?.access_token)throw new Error("Inter não autorizou esta integração.");
 return response.access_token;
}
export function reaisEmCentavos(value:string) {
 if(!/^\d{1,10}\.\d{2}$/.test(value))throw new Error("Valor Pix fora do padrão.");
 const [real,cents]=value.split(".");
 return Number(real)*100+Number(cents);
}
export async function consultarPixLiquidado(txid:string,expectedCents:number):Promise<VerifiedSettlement> {
 if(!/^[a-zA-Z0-9]{26,35}$/.test(txid))throw new Error("Identificador Pix inválido.");
 if(!Number.isSafeInteger(expectedCents)||expectedCents<=0)throw new Error("Cobrança inválida.");
 const cfg=config(); const bearer=await token(cfg);
 const result=await call(cfg,"GET","/pix/v2/cob/"+txid,undefined,bearer);
 if(result.status!==200)throw new Error("Cobrança Pix indisponível no Inter.");
 const data=result.data as {status?:string;txid?:string;pix?:Array<{endToEndId?:string;valor?:string;horario?:string}>};
 if(data.txid!==txid || data.status!=="CONCLUIDA" || !Array.isArray(data.pix))
   throw new Error("Pix não liquidado.");
 const exact=data.pix.find(p=>p.valor && reaisEmCentavos(p.valor)===expectedCents && p.endToEndId && p.horario);
 if(!exact)throw new Error("Valor Pix recebido não corresponde à cobrança.");
 const settledAt=new Date(exact.horario!);
 if(!Number.isFinite(settledAt.getTime()))throw new Error("Horário de liquidação inválido.");
 return {provider:"INTER_PIX",externalReference:txid,paymentId:exact.endToEndId!,receivedCents:expectedCents,
   settledAt,verifiedWithProvider:true};
}
export async function criarCobrancaPix(txid:string,expectedCents:number) {
 if(!/^[a-zA-Z0-9]{26,35}$/.test(txid)||!Number.isSafeInteger(expectedCents)||expectedCents<=0)
   throw new Error("Cobrança inválida.");
 const cfg=config(),bearer=await token(cfg);
 const original=(expectedCents/100).toFixed(2);
 const data=JSON.stringify({calendario:{expiracao:3600},valor:{original},chave:cfg.pixKey,
   solicitacaoPagador:"Assinatura da plataforma Ducha Elitte"});
 const res=await call(cfg,"PUT","/pix/v2/cob/"+txid,data,bearer);
 if(res.status!==200 && res.status!==201)throw new Error("Inter não criou a cobrança Pix.");
 const result=res.data as {txid?:string;loc?:{location?:string};pixCopiaECola?:string};
 if(result.txid!==txid)throw new Error("Referência bancária divergente.");
 return {txid,pixCopiaECola:result.pixCopiaECola ?? null};
}
