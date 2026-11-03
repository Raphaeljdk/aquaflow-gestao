import "server-only";
import {createHash} from "node:crypto";
import {hash,compare} from "bcryptjs";
import {prisma} from "@/lib/prisma";
import {withControlPlane} from "@/lib/saas/control-plane";
import {validNewPassword} from "./recovery-policy";
import {BusinessError} from "@/lib/domain";
export async function completeRecovery(token:string,newPassword:string){
 if(!/^[A-Za-z0-9_-]{40,100}$/.test(token))
  throw new BusinessError("Link inválido ou expirado. Solicite outro.",400);
 if(!validNewPassword(newPassword))
  throw new BusinessError("Use pelo menos 12 caracteres, letra maiúscula, minúscula e número.",400);
 const tokenHash=createHash("sha256").update(token).digest("hex");
 const replacement=await hash(newPassword,12);
 const claim=await withControlPlane(db=>db.$transaction(async tx=>{
  const rows=await tx.$queryRawUnsafe<Array<{account_kind:string;account_id:string}>>(
   "UPDATE platform_password_recovery SET used_at=now() WHERE token_hash=$1 "+
   "AND used_at IS NULL AND expires_at>now() RETURNING account_kind,account_id",tokenHash);
  if(!rows[0])throw new BusinessError("Link inválido, expirado ou já utilizado.",409);
  const item=rows[0];
  if(item.account_kind==="SAAS"){
   const identity=await tx.$queryRawUnsafe<Array<{password_hash:string}>>(
    "SELECT password_hash FROM platform_identities WHERE id=$1::uuid AND enabled=true FOR UPDATE",item.account_id);
   if(!identity[0])throw new BusinessError("Acesso indisponível.",409);
   if(await compare(newPassword,identity[0].password_hash))
    throw new BusinessError("Escolha uma senha diferente da anterior.",400);
   await tx.$executeRawUnsafe("UPDATE platform_identities SET password_hash=$1 WHERE id=$2::uuid",
    replacement,item.account_id);
  }
  return item;
 }));
 if(claim.account_kind==="LEGACY"){
  // The one-time central claim is atomic. The operational password remains
  // in the legacy DB, never copied to the central DB.
  await prisma.$transaction(async tx=>{
   const rows=await tx.$queryRawUnsafe<Array<{password:string;ativo:boolean}>>(
    'SELECT password,ativo FROM "User" WHERE id=$1 FOR UPDATE',claim.account_id);
   if(!rows[0]?.ativo)throw new BusinessError("Conta indisponível. Solicite outro link.",409);
   if(await compare(newPassword,rows[0].password))
    throw new BusinessError("Escolha uma senha diferente da anterior.",400);
   await tx.user.update({where:{id:claim.account_id},data:{password:replacement}});
  });
 }
 return {changed:true};
}
