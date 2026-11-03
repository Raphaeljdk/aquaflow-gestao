import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {requirePlatformAdmin} from "@/lib/platform-admin";
import {checkOrigin,apiError} from "@/lib/api";
import {withControlPlane} from "@/lib/saas/control-plane";
import {inviteRecoveryMode,recoverFailedOwnerInvite} from "@/lib/saas/invite-recovery";
import {BusinessError} from "@/lib/domain";
export const dynamic="force-dynamic";
export const runtime="nodejs";
/** Admin-only recovery of an approved legacy request. Does NOT create a Neon project. */
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  checkOrigin(request);
  await requirePlatformAdmin();
  if(!inviteRecoveryMode(process.env))
    throw new BusinessError("Recuperação de convites ainda não habilitada.",503);
  const {id}=await params;
  const legacy=await prisma.solicitacaoEmpresa.findUnique({where:{id},
    select:{email:true,nomeEmpresa:true,status:true}});
  if(!legacy||legacy.status!=="APROVADO")
    throw new BusinessError("Solicitação de implantação não aprovada.",409);
  const result=await withControlPlane(async db=>{
    const tenants=await db.$queryRaw<Array<{id:string}>>`
      SELECT id::text FROM platform_tenants
      WHERE lower(owner_email)=${legacy.email.trim().toLowerCase()}
        AND display_name=${legacy.nomeEmpresa}
      ORDER BY created_at LIMIT 2`;
    if(tenants.length!==1)
      throw new BusinessError("Empresa ambígua ou ausente; revisão manual necessária.",409);
    return recoverFailedOwnerInvite(db,tenants[0].id);
  });
  return NextResponse.json({queued:result.queued},
    {headers:{"Cache-Control":"private,no-store"}});
 }catch(error){return apiError(error)}
}
