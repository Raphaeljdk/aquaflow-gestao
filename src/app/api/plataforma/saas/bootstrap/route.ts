import {NextRequest,NextResponse} from "next/server";
import {hash} from "bcryptjs";
import {requirePlatformAdmin} from "@/lib/platform-admin";
import {withControlPlane} from "@/lib/saas/control-plane";
import {checkOrigin,apiError} from "@/lib/api";
import {BusinessError} from "@/lib/domain";

export const runtime="nodejs";
export const dynamic="force-dynamic";
/**
 * One-time bridge from the existing verified platform admin into the central
 * operator table BEFORE switching production to SaaS identity mode.
 * Never uses an exposed bootstrap token or a hardcoded default password.
 */
export async function POST(request:NextRequest) {
 try {
  if(process.env.VERCEL_ENV!=="production" ||
     process.env.SAAS_PRODUCTION_MODE==="true" ||
     process.env.SAAS_QA_MODE==="true")
   throw new BusinessError("Bootstrap central indisponível neste ambiente.",403);
  const admin=await requirePlatformAdmin();
  checkOrigin(request);
  if(Number(request.headers.get("content-length")||0)>1024)
   throw new BusinessError("Requisição muito grande.",413);
  const payload=await request.json() as {password?:unknown};
  const password=payload?.password;
  if(typeof password!=="string"||password.length<16||password.length>128||
     !/[A-Z]/.test(password)||!/[a-z]/.test(password)||
     !/[0-9]/.test(password)||!/[^A-Za-z0-9]/.test(password))
   throw new BusinessError("Defina uma senha nova de ao menos 16 caracteres, com letras, número e símbolo.",400);
  const hashed=await hash(password,12);
  const email=admin.email?.trim().toLowerCase();
  if(!email||email!==process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase())
   throw new BusinessError("Administrador não autorizado.",403);
  const result=await withControlPlane(db=>db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('saas:bootstrap:operator'))`;
   const count=await tx.$queryRaw<Array<{qty:number}>>`
    SELECT count(*)::int AS qty FROM platform_operators`;
   if(count[0]?.qty!==0)throw new BusinessError("Administrador central já inicializado.",409);
   const duplicates=await tx.$queryRaw<Array<{qty:number}>>`
    SELECT count(*)::int AS qty FROM platform_identities WHERE lower(email)=${email}`;
   if(duplicates[0]?.qty)throw new BusinessError("Identidade central já existente.",409);
   const ids=await tx.$queryRaw<Array<{id:string}>>`
    INSERT INTO platform_identities(email,password_hash,full_name)
    VALUES(${email},${hashed},${admin.name||"Gestor da plataforma"}) RETURNING id::text`;
   const id=ids[0]?.id;
   if(!id)throw new BusinessError("Operador não provisionado.",503);
   await tx.$executeRaw`
    INSERT INTO platform_operators(identity_id,enabled) VALUES(${id}::uuid,true)`;
   await tx.$executeRaw`
    INSERT INTO platform_audit_events(actor_identity_id,action,metadata)
    VALUES(${id}::uuid,'central_operator_bootstrapped','{"source":"verified_legacy_admin"}'::jsonb)`;
   return {created:true};
  }));
  return NextResponse.json(result,{headers:{"Cache-Control":"private,no-store"}});
 }catch(error){return apiError(error);}
}
