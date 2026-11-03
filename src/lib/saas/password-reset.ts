import "server-only";
import {createHash,randomBytes} from "node:crypto";
import {hash} from "bcryptjs";
import {prisma} from "@/lib/prisma";
import {withControlPlane} from "./control-plane";
import {requireValidResendSender} from "./resend-diagnostics";
import {BusinessError} from "@/lib/domain";

const digest=(value:string)=>createHash("sha256").update(value).digest("hex");
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const NEUTRAL={message:"Se este e-mail tiver uma conta ativa, enviaremos um link para redefinir a senha. Se seu cadastro ainda não foi ativado, procure o suporte para receber o convite de acesso."};

export async function requestPasswordReset(emailInput:string,ip:string){
 const email=emailInput.trim().toLowerCase();
 if(email.length>254||!EMAIL.test(email))throw new BusinessError("Informe um e-mail válido.",400);
 const salt=process.env.NEXTAUTH_SECRET??process.env.AUTH_SECRET;
 if(!salt||!process.env.RESEND_API_KEY||!process.env.NOTIFICATION_FROM_EMAIL)
  throw new BusinessError("Recuperação temporariamente indisponível.",503);
 const emailHash=digest(salt+":email:"+email),originHash=digest(salt+":ip:"+ip);
 const legacy=await prisma.user.findUnique({where:{email},select:{id:true,ativo:true}});
 const account=legacy?.ativo ? {kind:"LEGACY",id:legacy.id} : await withControlPlane(async db=>{
   const identities=await db.$queryRaw<Array<{id:string}>>`
     SELECT i.id::text FROM platform_identities i
     WHERE lower(i.email)=${email} AND i.enabled=true
       AND (EXISTS(SELECT 1 FROM platform_memberships m WHERE m.identity_id=i.id AND m.enabled)
         OR EXISTS(SELECT 1 FROM platform_operators o WHERE o.identity_id=i.id AND o.enabled))
     LIMIT 1`;
   return identities[0]?{kind:"SAAS",id:identities[0].id}:null;
 });
 // Unknown or unactivated accounts get the same answer; never create an identity here.
 if(!account)return NEUTRAL;
 const token=randomBytes(32).toString("base64url");
 const tokenHash=digest(token);
 const queued=await withControlPlane(db=>db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${emailHash}))`;
   const counts=await tx.$queryRaw<Array<{emails:number;origins:number}>>`
     SELECT
      (SELECT count(*)::integer FROM platform_password_resets
        WHERE email_hash=${emailHash} AND created_at>now()-INTERVAL '1 hour') AS emails,
      (SELECT count(*)::integer FROM platform_password_resets
        WHERE origin_hash=${originHash} AND created_at>now()-INTERVAL '1 hour') AS origins`;
   if((counts[0]?.emails??0)>=3 || (counts[0]?.origins??0)>=10)return false;
   await tx.$executeRaw`UPDATE platform_password_resets SET state='USED',used_at=now()
     WHERE email_hash=${emailHash} AND state='PENDING'`;
   await tx.$executeRaw`
     INSERT INTO platform_password_resets(token_hash,email_hash,origin_hash,account_kind,account_id,expires_at)
     VALUES(${tokenHash},${emailHash},${originHash},${account.kind},${account.id},now()+INTERVAL '30 minutes')`;
   return true;
 }));
 if(!queued)return NEUTRAL;
 const url="https://www.duchaelitte.com.br/redefinir-senha?token="+encodeURIComponent(token);
 const sender=requireValidResendSender(process.env.NOTIFICATION_FROM_EMAIL);
 try {
   const r=await fetch("https://api.resend.com/emails",{
     method:"POST",
     headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json","Idempotency-Key":"password-reset-"+tokenHash},
     body:JSON.stringify({
       from:sender,to:[email],subject:"Ducha Elitte | Redefinição de senha",
       text:"Recebemos um pedido de redefinição de senha da Ducha Elitte.\n\nUse este link único, válido por 30 minutos:\n"+url+"\n\nSe não pediu, ignore esta mensagem.",
       html:`<main style="font-family:Arial,Helvetica,sans-serif;background:#111;color:#fff;padding:32px;border-radius:18px;max-width:540px;margin:auto"><p style="color:#facc15;letter-spacing:2px;font-weight:bold">DUCHA ELITTE</p><h1>Redefinir sua senha</h1><p>Use o link abaixo para criar uma nova senha de acesso. Ele expira em 30 minutos e funciona uma única vez.</p><p style="margin:28px 0"><a style="background:#facc15;color:#111;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:bold" href="${url}">Redefinir senha</a></p><p style="color:#aaa;font-size:13px">Se você não solicitou, ignore esta mensagem. Não informe senhas ao suporte.</p></main>`
     }),signal:AbortSignal.timeout(12000)
   });
   if(!r.ok)console.error("[password-reset] Provedor de e-mail recusou solicitação; verificar configuração.");
 }catch{
   console.error("[password-reset] Entrega indisponível; não registrar dados pessoais.");
 }
 return NEUTRAL;
}

export async function completePasswordReset(token:string,password:string){
 if(!TOKEN.test(token))throw new BusinessError("Link inválido ou expirado.",400);
 if(password.length<12||password.length>128||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password))
   throw new BusinessError("Use 12 ou mais caracteres, com letra maiúscula, minúscula e número.",400);
 const passwordHash=await hash(password,12);
 const tokenHash=digest(token);
 const result=await withControlPlane(db=>db.$transaction(async tx=>{
   const rows=await tx.$queryRaw<Array<{id:string;account_kind:string;account_id:string}>>`
      SELECT id::text,account_kind,account_id FROM platform_password_resets
      WHERE token_hash=${tokenHash} AND state='PENDING' AND expires_at>now()
      FOR UPDATE`;
   const row=rows[0];
   if(!row)throw new BusinessError("Link inválido, utilizado ou expirado. Solicite outro.",409);
   if(row.account_kind==="SAAS"){
     const changed=await tx.$queryRaw<Array<{id:string}>>`
       UPDATE platform_identities SET password_hash=${passwordHash}
       WHERE id::text=${row.account_id} AND enabled=true RETURNING id::text`;
     if(changed.length!==1)throw new BusinessError("Conta indisponível. Entre em contato com o suporte.",409);
   }else if(row.account_kind!=="LEGACY")throw new BusinessError("Conta inválida.",409);
   await tx.$executeRaw`UPDATE platform_password_resets SET state='USED',used_at=now() WHERE id=${row.id}::uuid`;
   return {kind:row.account_kind,id:row.account_id};
 }));
 if(result.kind==="LEGACY"){
   const changed=await prisma.user.updateMany({where:{id:result.id,ativo:true},data:{password:passwordHash}});
   if(changed.count!==1)throw new BusinessError("Conta indisponível. Solicite outro link ou procure o suporte.",409);

 }
 return {changed:true};
}
