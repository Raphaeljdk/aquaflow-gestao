import {NextRequest,NextResponse} from "next/server";
import {createHash} from "node:crypto";
import {hash,compare} from "bcryptjs";
import {z} from "zod";
import {currentUser} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {withControlPlane} from "@/lib/saas/control-plane";
import {validNewPassword} from "@/lib/auth/recovery-policy";
import {BusinessError} from "@/lib/domain";
import {checkOrigin,apiError} from "@/lib/api";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const input=z.object({currentPassword:z.string().min(1).max(128),
 newPassword:z.string().min(12).max(128)});
export async function POST(request:NextRequest){
 try{
  checkOrigin(request);
  if(Number(request.headers.get("content-length")??0)>1024)
   throw new BusinessError("Requisição muito grande.",413);
  const user=await currentUser();
  const values=input.parse(await request.json());
  if(!validNewPassword(values.newPassword))
   throw new BusinessError("Use 12 caracteres, maiúscula, minúscula e número.",400);
  if(values.currentPassword===values.newPassword)
   throw new BusinessError("Escolha uma senha diferente da atual.",400);
  const attemptKey="pw-change-"+createHash("sha256").update(user.id).digest("hex");
  const permitted=await withControlPlane(db=>db.$transaction(async tx=>{
   await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))",attemptKey);
   const rows=await tx.$queryRawUnsafe<Array<{attempts:number;expires_at:Date}>>(
    "SELECT attempts,expires_at FROM platform_login_attempts WHERE key=$1",attemptKey);
   if(rows[0]&&rows[0].expires_at>new Date()&&rows[0].attempts>=5)return false;
   await tx.$executeRawUnsafe(
    "INSERT INTO platform_login_attempts(key,attempts,expires_at) VALUES($1,1,now()+INTERVAL '15 minutes') "+
    "ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN platform_login_attempts.expires_at<=now() THEN 1 ELSE platform_login_attempts.attempts+1 END, "+
    "expires_at=CASE WHEN platform_login_attempts.expires_at<=now() THEN now()+INTERVAL '15 minutes' ELSE platform_login_attempts.expires_at END",attemptKey);
   return true;
  }));
  if(!permitted)throw new BusinessError("Muitas tentativas. Tente novamente em 15 minutos.",429);
  const replacement=await hash(values.newPassword,12);
  if(user.tenantId||user.platformOperator){
   await withControlPlane(db=>db.$transaction(async tx=>{
    const rows=await tx.$queryRawUnsafe<Array<{password_hash:string}>>(
     "SELECT password_hash FROM platform_identities WHERE id=$1::uuid AND enabled=true FOR UPDATE",user.id);
    if(!rows[0]||!await compare(values.currentPassword,rows[0].password_hash))
     throw new BusinessError("Senha atual incorreta.",403);
    await tx.$executeRawUnsafe("UPDATE platform_identities SET password_hash=$1 WHERE id=$2::uuid",replacement,user.id);
   }));
  }else{
   await prisma.$transaction(async tx=>{
    const rows=await tx.$queryRawUnsafe<Array<{password:string;ativo:boolean}>>(
     'SELECT password,ativo FROM "User" WHERE id=$1 FOR UPDATE',user.id);
    if(!rows[0]?.ativo||!await compare(values.currentPassword,rows[0].password))
     throw new BusinessError("Senha atual incorreta.",403);
    await tx.user.update({where:{id:user.id},data:{password:replacement}});
   });
  }
  await withControlPlane(db=>db.$executeRawUnsafe("DELETE FROM platform_login_attempts WHERE key=$1",attemptKey));
  return NextResponse.json({changed:true},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return apiError(e);}
}
