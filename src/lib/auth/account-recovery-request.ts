import "server-only";
import {createHash,randomBytes} from "node:crypto";
import {prisma} from "@/lib/prisma";
import {withControlPlane} from "@/lib/saas/control-plane";
import {requireValidResendSender} from "@/lib/saas/resend-diagnostics";
import {recoveryLinkMinutes} from "./recovery-policy";
type Identity={kind:"LEGACY"|"SAAS";id:string;email:string};
const sha=(value:string)=>createHash("sha256").update(value).digest("hex");
export const genericRecoveryMessage="Se existir um cadastro para esse e-mail, enviaremos instruções de acesso.";
async function allowedRequest(email:string,ip:string){
 const secret=process.env.NEXTAUTH_SECRET??process.env.AUTH_SECRET;
 if(!secret)throw new Error("Segredo de autenticação ausente.");
 const keys=[
  {key:"pw-reset-ip-"+sha(secret+"|"+ip),limit:8,minutes:15},
  {key:"pw-reset-email-"+sha(secret+"|"+email),limit:3,minutes:60},
 ].sort((a,b)=>a.key.localeCompare(b.key));
 return withControlPlane(db=>db.$transaction(async tx=>{
  for(const k of keys)await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))",k.key);
  let allowed=true;
  for(const k of keys){
   const previous=await tx.$queryRawUnsafe<Array<{attempts:number;expires_at:Date}>>(
    "SELECT attempts,expires_at FROM platform_login_attempts WHERE key=$1",k.key);
   if(previous[0]&&previous[0].expires_at>new Date()&&previous[0].attempts>=k.limit)allowed=false;
   await tx.$executeRawUnsafe(
    "INSERT INTO platform_login_attempts(key,attempts,expires_at) VALUES($1,1,now()+make_interval(mins=>$2::int)) "+
    "ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN platform_login_attempts.expires_at<=now() THEN 1 ELSE platform_login_attempts.attempts+1 END, "+
    "expires_at=CASE WHEN platform_login_attempts.expires_at<=now() THEN now()+make_interval(mins=>$2::int) ELSE platform_login_attempts.expires_at END",
    k.key,k.minutes);
  }
  return allowed;
 }));
}
async function getIdentity(email:string,slug:string):Promise<Identity|null>{
 const legacy=await prisma.user.findUnique({where:{email},select:{id:true,email:true,ativo:true}});
 const central=await withControlPlane(db=>db.$queryRawUnsafe<Array<{id:string;email:string}>>(
  slug?
   "SELECT i.id::text,i.email FROM platform_identities i JOIN platform_memberships m ON m.identity_id=i.id "+
   "JOIN platform_tenants t ON t.id=m.tenant_id WHERE lower(i.email)=$1 AND t.slug=$2 AND i.enabled AND m.enabled LIMIT 1":
   "SELECT i.id::text,i.email FROM platform_identities i WHERE lower(i.email)=$1 AND i.enabled AND "+
   "(EXISTS(SELECT 1 FROM platform_memberships m WHERE m.identity_id=i.id AND m.enabled) OR "+
   "EXISTS(SELECT 1 FROM platform_operators p WHERE p.identity_id=i.id AND p.enabled)) LIMIT 1",
  ...(slug?[email,slug]:[email])));
 if(slug)return central[0]?{kind:"SAAS",...central[0]}:null;
 if(legacy?.ativo)return {kind:"LEGACY",id:legacy.id,email:legacy.email};
 return central[0]?{kind:"SAAS",...central[0]}:null;
}
async function deliverRecoveryMessage(email:string,subject:string,body:string,link?:string){
 const apiKey=process.env.RESEND_API_KEY;
 if(!apiKey)throw new Error("Envio de recuperação indisponível.");
 const from=requireValidResendSender(process.env.NOTIFICATION_FROM_EMAIL);
 const html='<main style="max-width:520px;margin:auto;background:#121212;color:#fff;padding:30px;border-radius:16px;font-family:Arial,sans-serif">'+
  '<p style="color:#facc15;font-weight:bold;letter-spacing:2px">DUCHA ELITTE</p>'+
  '<h1 style="font-size:24px">'+(link?"Recupere seu acesso":"Seu cadastro está em andamento")+'</h1>'+
  '<p style="line-height:1.6;color:#dedede">'+body+'</p>'+
  (link?'<p style="margin:28px 0"><a href="'+link+'" style="background:#facc15;color:#151515;padding:14px 20px;border-radius:9px;font-weight:bold;text-decoration:none">Criar nova senha</a></p>':"")+
  '<p style="font-size:12px;color:#aaa">Se você não fez esta solicitação, ignore o e-mail. Não compartilhe links ou senhas.</p></main>';
 const res=await fetch("https://api.resend.com/emails",{
  method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
  body:JSON.stringify({from,to:[email],subject,text:body+(link?"\n\n"+link:""),html}),
  signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw new Error("Envio de recuperação não confirmado.");
 const data=await res.json() as {id?:string};
 if(!data.id)throw new Error("Envio de recuperação não confirmado.");
}
export async function requestRecovery(email:string,slug:string,ip:string):Promise<string>{
 if(!await allowedRequest(email,ip))return genericRecoveryMessage;
 const account=await getIdentity(email,slug);
 if(!account){
  if(!slug){
   const pending=await withControlPlane(db=>db.$queryRawUnsafe<Array<{email:string}>>(
    "SELECT owner_email AS email FROM platform_tenants WHERE lower(owner_email)=$1 "+
    "AND state IN ('PENDING','PROVISIONING','ERROR') LIMIT 1",email));
   if(pending[0])await deliverRecoveryMessage(pending[0].email,
    "Ducha Elitte | Acompanhamento do cadastro",
    "Seu cadastro foi recebido, mas a conta ainda não está ativada. A primeira senha será criada por um convite de ativação após a preparação do estabelecimento e a confirmação do plano, quando aplicável. Se precisar de ajuda, fale com o suporte.");
  }
  return genericRecoveryMessage;
 }
 const token=randomBytes(32).toString("base64url"),tokenHash=sha(token);
 await withControlPlane(db=>db.$transaction(async tx=>{
  await tx.$executeRawUnsafe("UPDATE platform_password_recovery SET used_at=now() WHERE account_kind=$1 "+
    "AND account_id=$2 AND used_at IS NULL",account.kind,account.id);
  await tx.$executeRawUnsafe("INSERT INTO platform_password_recovery(token_hash,account_kind,account_id,expires_at) "+
    "VALUES($1,$2,$3,now()+make_interval(mins=>$4::int))",
    tokenHash,account.kind,account.id,recoveryLinkMinutes);
 }));
 const url="https://www.duchaelitte.com.br/redefinir-senha?token="+token;
 try{
  await deliverRecoveryMessage(account.email,"Ducha Elitte | Redefinição de senha",
   "Recebemos um pedido de redefinição de senha. Este link de uso único expira em 20 minutos.",url);
 }catch(error){
  await withControlPlane(db=>db.$executeRawUnsafe("UPDATE platform_password_recovery SET used_at=now() "+
   "WHERE token_hash=$1 AND used_at IS NULL",tokenHash));
  throw error;
 }
 return genericRecoveryMessage;
}
