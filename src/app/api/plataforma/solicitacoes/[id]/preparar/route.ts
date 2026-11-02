import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {requirePlatformAdmin} from "@/lib/platform-admin";
import {withControlPlane} from "@/lib/saas/control-plane";
import {registerTrialRequest,approveTrialRequest} from "@/lib/saas/signup";
import {checkOrigin,apiError} from "@/lib/api";
import {BusinessError} from "@/lib/domain";
export const runtime="nodejs";
export const dynamic="force-dynamic";
/** Transitional operation: explicitly migrate one APPROVED legacy request into the
 * central SaaS queue. No access and no Stripe charge are created here. */
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try {
  await requirePlatformAdmin();checkOrigin(request);
  if(process.env.SAAS_PRODUCTION_MODE==="true")throw new BusinessError("Faça a gestão pelo painel SaaS.",409);
  const {id}=await params;
  const legacy=await prisma.solicitacaoEmpresa.findUnique({where:{id}});
  if(!legacy||legacy.status!=="APROVADO")throw new BusinessError("Aprove a solicitação primeiro.",409);
  const email=legacy.email.trim().toLowerCase();
  const phone=legacy.whatsapp.replace(/\D/g,"");
  const whatsapp=phone.startsWith("55")?phone:"55"+phone;
  const kind=legacy.modalidadeCadastro==="TESTE_7_DIAS"?"TESTE_7_DIAS":"CONTRATACAO";
  const tenant=await withControlPlane(async db=>{
   const exists=await db.$queryRaw<Array<{id:string;state:string;display_name:string}>>`
    SELECT id::text,state,display_name FROM platform_tenants
    WHERE lower(owner_email)=${email} ORDER BY created_at LIMIT 2`;
   if(exists.length>1)throw new BusinessError("Mais de uma empresa corresponde a este contato. Revisão manual necessária.",409);
   let tenantId=exists[0]?.id;
   let state=exists[0]?.state;
   if(tenantId&&exists[0].display_name!==legacy.nomeEmpresa)
    throw new BusinessError("Já existe outra empresa com este e-mail. Revisão manual necessária.",409);
   if(!tenantId){
    const created=await registerTrialRequest(db,{nomeEmpresa:legacy.nomeEmpresa,
     nomeResponsavel:legacy.nomeResponsavel,email,whatsapp,kind,
     plan:legacy.planoPagamento??undefined,method:legacy.formaPagamentoPrevista??undefined});
    tenantId=created.id;state="PENDING";
   }
   if(state==="PENDING")await approveTrialRequest(db,tenantId);
   return tenantId;
  });
  return NextResponse.json({queued:true,tenantId:tenant,notice:"Banco exclusivo aguardando provisionamento. Nenhuma cobrança efetuada."});
 }catch(e){return apiError(e);}
}
