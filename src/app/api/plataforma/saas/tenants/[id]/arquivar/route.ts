import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {requirePlatformAdmin} from "@/lib/platform-admin";
import {checkOrigin,apiError} from "@/lib/api";
import {withControlPlane} from "@/lib/saas/control-plane";
import {BusinessError} from "@/lib/domain";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Archive the empty unapproved registry record only; NEVER delete business data or Neon projects. */
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  await requirePlatformAdmin();
  checkOrigin(request);
  const {id}=await params;
  if(!uuid.test(id))throw new BusinessError("Estabelecimento inválido.",400);
  const {confirmation}=z.object({confirmation:z.literal("ARQUIVAR")}).parse(await request.json());
  void confirmation;
  const result=await withControlPlane(db=>db.$transaction(async tx=>{
    const rows=await tx.$queryRaw<Array<{
      state:string;license:string;has_db:boolean;owner_count:number;charges:number;
      invitations:number;has_trial:boolean;job_attempts:number;job_state:string|null;
    }>>`
      SELECT t.state,e.state AS license,
       (t.neon_project_id IS NOT NULL OR t.encrypted_database_url IS NOT NULL) AS has_db,
       (SELECT count(*)::int FROM platform_memberships m WHERE m.tenant_id=t.id) AS owner_count,
       (SELECT count(*)::int FROM platform_billing_charges b WHERE b.tenant_id=t.id) AS charges,
       (SELECT count(*)::int FROM platform_invitations v WHERE v.tenant_id=t.id) AS invitations,
       (e.trial_started_at IS NOT NULL OR e.paid_through IS NOT NULL) AS has_trial,
       COALESCE((SELECT j.attempts FROM platform_provisioning_jobs j WHERE j.tenant_id=t.id LIMIT 1),0) AS job_attempts,
       (SELECT j.state FROM platform_provisioning_jobs j WHERE j.tenant_id=t.id LIMIT 1) AS job_state
      FROM platform_tenants t JOIN platform_entitlements e ON e.tenant_id=t.id
      WHERE t.id=${id}::uuid FOR UPDATE OF t,e`;
    const t=rows[0];
    if(!t)throw new BusinessError("Cadastro não encontrado.",404);
    if(!["PENDING","PROVISIONING"].includes(t.state)||t.license!=="PENDING"||t.has_db||
      t.owner_count!==0||t.charges!==0||t.invitations!==0||t.has_trial||
      t.job_attempts!==0||!([null,"PENDING"].includes(t.job_state)))
      throw new BusinessError("Este cadastro possui banco, usuário, convite, teste, cobrança ou trabalho iniciado. Revise manualmente: não é seguro excluí-lo.",409);
    await tx.$executeRaw`
      UPDATE platform_tenants SET state='SUSPENDED',updated_at=now()
      WHERE id=${id}::uuid AND state IN ('PENDING','PROVISIONING')`;
    await tx.$executeRaw`
      INSERT INTO platform_audit_events(tenant_id,action,metadata)
      VALUES(${id}::uuid,'tenant_archived',${JSON.stringify({previousState:t.state,reason:"unapproved_empty_record",method:"soft_archive"})}::jsonb)`;
    return {archived:true,retained:true};
  }));
  return NextResponse.json(result,{headers:{"Cache-Control":"private,no-store"}});
 }catch(error){return apiError(error);}
}
