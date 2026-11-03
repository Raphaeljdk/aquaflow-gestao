import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {requirePlatformAdmin} from "@/lib/platform-admin";
import {withControlPlane} from "@/lib/saas/control-plane";
import {registerTrialRequest,approveTrialRequest} from "@/lib/saas/signup";
import {checkOrigin,apiError} from "@/lib/api";
import {BusinessError} from "@/lib/domain";
import {processOneProvisioningJob} from "@/lib/saas/provisioning-worker";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;
/** Transitional operation: explicitly migrate one APPROVED legacy request into the
 * central SaaS queue. No access and no Stripe charge are created here. */

type RouteParams={params:Promise<{id:string}>};
async function getApprovedRequest(id:string) {
 await requirePlatformAdmin();
 if(process.env.SAAS_PRODUCTION_MODE==="true")
  throw new BusinessError("Use o painel SaaS para acompanhar esta empresa.",409);
 const request=await prisma.solicitacaoEmpresa.findUnique({where:{id}});
 if(!request||request.status!=="APROVADO")throw new BusinessError("A solicitação precisa estar aprovada.",409);
 return request;
}
async function getCentralProgress(email:string,company:string){
 return withControlPlane(async db=>{
  const rows=await db.$queryRaw<Array<{id:string;state:string;job_state:string|null;has_database:boolean;invitation_count:number;sent_invitations:number;failed_invitations:number}>>`
   SELECT t.id::text,t.state,j.state AS job_state,
    (t.neon_project_id IS NOT NULL AND t.encrypted_database_url IS NOT NULL) AS has_database,
    (SELECT count(*)::int FROM platform_notification_outbox o WHERE o.tenant_id=t.id AND o.channel='EMAIL' AND o.template_key='owner_invite') AS invitation_count,
    (SELECT count(*)::int FROM platform_notification_outbox o WHERE o.tenant_id=t.id AND o.channel='EMAIL' AND o.template_key='owner_invite' AND o.state='SENT') AS sent_invitations,
    (SELECT count(*)::int FROM platform_notification_outbox o WHERE o.tenant_id=t.id AND o.channel='EMAIL' AND o.template_key='owner_invite' AND o.state='ERROR') AS failed_invitations
   FROM platform_tenants t LEFT JOIN platform_provisioning_jobs j ON j.tenant_id=t.id
   WHERE lower(t.owner_email)=${email.toLowerCase()} AND t.display_name=${company}
   ORDER BY t.created_at DESC LIMIT 2`;
  if(rows.length>1)throw new BusinessError("Cadastro central duplicado; revisão manual necessária.",409);
  return rows[0]??null;
 });
}
function progress(r:Awaited<ReturnType<typeof getCentralProgress>>) {
 return {tenantId:r?.id??null,state:r?.state??"NOT_STARTED",jobState:r?.job_state??null,
  hasDatabase:r?.has_database??false,invitationQueued:(r?.invitation_count??0)>0,
  invitationSent:(r?.sent_invitations??0)>0,
  invitationFailed:(r?.failed_invitations??0)>0};
}
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const request=await getApprovedRequest((await params).id);
  const r=await getCentralProgress(request.email.trim().toLowerCase(),request.nomeEmpresa);
  return NextResponse.json({name:request.nomeEmpresa,trial:request.modalidadeCadastro==="TESTE_7_DIAS",...progress(r)},
   {headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return apiError(e)}
}

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try {
  checkOrigin(request);
  await requirePlatformAdmin();
  if(process.env.SAAS_PRODUCTION_MODE==="true")throw new BusinessError("Faça a gestão pelo painel SaaS.",409);
  const {id}=await params;
  const legacy=await getApprovedRequest(id);
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
  let status=await getCentralProgress(email,legacy.nomeEmpresa);
  if(status?.state==="ERROR")throw new BusinessError("Provisionamento falhou; revisar manualmente, não repetir Neon.",409);
  if(status?.state==="PROVISIONING"&&status.job_state==="PENDING"){
   await processOneProvisioningJob(tenant);
   status=await getCentralProgress(email,legacy.nomeEmpresa);
  }
  return NextResponse.json({name:legacy.nomeEmpresa,trial:kind==="TESTE_7_DIAS",...progress(status)},
    {headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return apiError(e);}
}
