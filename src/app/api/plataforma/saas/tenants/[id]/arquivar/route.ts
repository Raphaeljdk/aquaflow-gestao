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
      used_invitations:number;identity_exists:boolean;has_trial:boolean;job_attempts:number;job_state:string|null;
    }>>`
      SELECT t.state,e.state AS license,
       (t.neon_project_id IS NOT NULL OR t.encrypted_database_url IS NOT NULL) AS has_db,
       (SELECT count(*)::int FROM platform_memberships m WHERE m.tenant_id=t.id) AS owner_count,
       (SELECT count(*)::int FROM platform_billing_charges b WHERE b.tenant_id=t.id) AS charges,
       (SELECT count(*)::int FROM platform_invitations v WHERE v.tenant_id=t.id AND v.used_at IS NOT NULL) AS used_invitations,
       EXISTS(SELECT 1 FROM platform_identities i WHERE lower(i.email)=lower(t.owner_email)) AS identity_exists,
       (e.trial_started_at IS NOT NULL OR e.paid_through IS NOT NULL) AS has_trial,
       COALESCE((SELECT j.attempts FROM platform_provisioning_jobs j WHERE j.tenant_id=t.id LIMIT 1),0) AS job_attempts,
       (SELECT j.state FROM platform_provisioning_jobs j WHERE j.tenant_id=t.id LIMIT 1) AS job_state
      FROM platform_tenants t JOIN platform_entitlements e ON e.tenant_id=t.id
      WHERE t.id=${id}::uuid FOR UPDATE OF t,e`;
    const t=rows[0];
    if(!t)throw new BusinessError("Cadastro não encontrado.",404);
    const emptyPending=!t.has_db&&["PENDING","PROVISIONING"].includes(t.state)&&
      t.job_attempts===0&&[null,"PENDING"].includes(t.job_state);
    const preparedUnclaimed=t.has_db&&t.state==="READY"&&t.job_state==="DONE";
    if(!(emptyPending||preparedUnclaimed)||t.license!=="PENDING"||
      t.owner_count!==0||t.identity_exists||t.charges!==0||t.used_invitations!==0||t.has_trial)
      throw new BusinessError("Esta empresa possui acesso, teste, cobrança ou provisionamento incerto. Arquivamento negado; revise manualmente para preservar o banco.",409);
    // Revoke unclaimed links without deleting invitation history. Archived tenants
    // cannot reactivate a token, and notification delivery excludes archived tenants.
    await tx.$executeRaw`UPDATE platform_invitations SET expires_at=now()
      WHERE tenant_id=${id}::uuid AND used_at IS NULL AND expires_at>now()`;
    await tx.$executeRaw`
      UPDATE platform_tenants SET state='SUSPENDED',updated_at=now()
      WHERE id=${id}::uuid AND state IN ('PENDING','PROVISIONING','READY')`;
    await tx.$executeRaw`
      INSERT INTO platform_audit_events(tenant_id,action,metadata)
      VALUES(${id}::uuid,'tenant_archived',${JSON.stringify({previousState:t.state,reason:"unapproved_unclaimed_record",method:"soft_archive",neonRetained:t.has_db})}::jsonb)`;
    return {archived:true,retained:true};
  }));
  return NextResponse.json(result,{headers:{"Cache-Control":"private,no-store"}});
 }catch(error){return apiError(error);}
}
