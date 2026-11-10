import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { checkOrigin, apiError } from "@/lib/api";
import { withControlPlane } from "@/lib/saas/control-plane";
import { BusinessError } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const schema=z.object({
 confirmation:z.literal("EXCLUIR CADASTRO"),
 slug:z.string().min(1).max(100),
}).strict();

/**
 * Remove apenas um cadastro SaaS ainda sem operações.
 * Todas as dependências são excluídas na mesma transação, e histórico
 * de auditoria fica desvinculado do tenant removido.
 * Qualquer referência desconhecida bloqueia o DELETE e causa rollback.
 */
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
 try{
  const admin=await requirePlatformAdmin();
  checkOrigin(request);
  const {id}=await params;
  if(!uuid.test(id))throw new BusinessError("Cadastro inválido.",400);
  const length=Number(request.headers.get("content-length")??"0");
  if(length>2000)throw new BusinessError("Requisição inválida.",413);
  const input=schema.parse(await request.json());
  const result=await withControlPlane(db=>db.$transaction(async tx=>{
    const rows=await tx.$queryRaw<Array<{slug:string;state:string;license:string|null;
      has_db:boolean;members:number;identity_exists:boolean;charges:number;
      checkout_tokens:number;used_invitations:number;has_trial:boolean;
      unsafe_jobs:number}>>`
      SELECT t.slug,t.state,e.state AS license,
       (t.neon_project_id IS NOT NULL OR t.encrypted_database_url IS NOT NULL) AS has_db,
       (SELECT count(*)::int FROM platform_memberships m WHERE m.tenant_id=t.id) AS members,
       EXISTS(SELECT 1 FROM platform_identities i WHERE lower(i.email)=lower(t.owner_email)) AS identity_exists,
       (SELECT count(*)::int FROM platform_billing_charges b WHERE b.tenant_id=t.id) AS charges,
       (SELECT count(*)::int FROM platform_checkout_access_tokens c WHERE c.tenant_id=t.id) AS checkout_tokens,
       (SELECT count(*)::int FROM platform_invitations v WHERE v.tenant_id=t.id AND v.used_at IS NOT NULL) AS used_invitations,
       (e.trial_started_at IS NOT NULL OR e.trial_ends_at IS NOT NULL OR e.paid_through IS NOT NULL) AS has_trial,
       (SELECT count(*)::int FROM platform_provisioning_jobs j
         WHERE j.tenant_id=t.id AND (j.attempts>0 OR j.state<>'PENDING')) AS unsafe_jobs
      FROM platform_tenants t
      JOIN platform_entitlements e ON e.tenant_id=t.id
      WHERE t.id=${id}::uuid FOR UPDATE OF t,e`;
    const t=rows[0];
    if(!t)throw new BusinessError("Cadastro não encontrado.",404);
    if(t.slug!==input.slug)throw new BusinessError("Código da empresa não confere. Nada foi excluído.",409);
    if(t.has_db||t.members>0||t.identity_exists||t.charges>0||t.checkout_tokens>0||
       t.used_invitations>0||t.has_trial||t.unsafe_jobs>0||t.license!=="PENDING"||
       !["PENDING","PROVISIONING","SUSPENDED","ERROR"].includes(t.state))
      throw new BusinessError(
        "Este cadastro já tem banco, usuário, convite utilizado, cobrança ou implantação iniciada. Exclusão bloqueada para proteger dados e assinaturas.",409);
    // Invalidar convites e claims ainda não utilizados antes de remover o tenant.
    await tx.$executeRaw`DELETE FROM platform_notification_claims
      WHERE outbox_id IN (SELECT id FROM platform_notification_outbox WHERE tenant_id=${id}::uuid)`;
    await tx.$executeRaw`DELETE FROM platform_notification_outbox WHERE tenant_id=${id}::uuid`;
    await tx.$executeRaw`DELETE FROM platform_invitations WHERE tenant_id=${id}::uuid`;
    await tx.$executeRaw`DELETE FROM platform_provisioning_jobs WHERE tenant_id=${id}::uuid`;
    // Auditoria histórica permanece, mas sem FK para o cadastro eliminado.
    await tx.$executeRaw`UPDATE platform_audit_events SET tenant_id=NULL WHERE tenant_id=${id}::uuid`;
    await tx.$executeRaw`DELETE FROM platform_entitlements WHERE tenant_id=${id}::uuid`;
    const removed=await tx.$executeRaw`DELETE FROM platform_tenants WHERE id=${id}::uuid`;
    if(removed!==1)throw new BusinessError("Cadastro mudou. Tente novamente.",409);
    await tx.$executeRaw`INSERT INTO platform_audit_events(action,metadata)
      VALUES('tenant_unprovisioned_registration_deleted',
      ${JSON.stringify({tenantId:id,slug:t.slug,actor:admin.email,reason:"manual_platform_admin_delete"})}::jsonb)`;
    return {deleted:true,slug:t.slug};
  }));
  return NextResponse.json(result,{headers:{"Cache-Control":"private, no-store"}});
 }catch(error){return apiError(error);}
}
