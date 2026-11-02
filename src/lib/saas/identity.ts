import "server-only";
import { compare } from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { BusinessError } from "@/lib/domain";
import type { Role, User } from "@/types";
import { withControlPlane } from "./control-plane";
import { effectiveState, type Entitlement } from "./entitlement";

export const saasPilotMode = () => process.env.SAAS_QA_MODE === "true";
export type TenantSessionUser = User & { tenantId: string; tenantSlug: string; platformRole: string };
type RecordRow = {
  id: string; email: string; full_name: string; password_hash: string;
  identity_enabled: boolean; tenant_id: string; slug: string; tenant_state: string;
  member_enabled: boolean; platform_role: string; neon_project_id: string | null;
  encrypted_database_url: string | null; license_state: Entitlement["state"] | null;
  trial_started_at: Date | null; trial_ends_at: Date | null;
  paid_through: Date | null; grace_ends_at: Date | null;
};
const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function mapRole(value: string): Role {
  if (value === "OWNER") return "ADMIN";
  if (value === "MANAGER") return "GERENTE";
  if (value === "EMPLOYEE") return "FUNCIONARIO";
  throw new BusinessError("Perfil não autorizado.", 403);
}
function validateAccess(row: RecordRow | undefined) {
  if (!row || !row.identity_enabled || !row.member_enabled)
    throw new BusinessError("Acesso não autorizado para este estabelecimento.", 403);
  if (row.tenant_state !== "READY" || !row.neon_project_id || !row.encrypted_database_url)
    throw new BusinessError("O ambiente deste lava-rápido ainda não está pronto.", 503);
  if (!row.license_state)
    throw new BusinessError("Licença indisponível.", 423);
  const status=effectiveState({
    state:row.license_state, trialStartedAt:row.trial_started_at,
    trialEndsAt:row.trial_ends_at, paidThrough:row.paid_through,
    graceEndsAt:row.grace_ends_at,
  },new Date());
  if (!["TRIAL","ACTIVE","GRACE"].includes(status))
    throw new BusinessError("O período de teste ou assinatura expirou. Contrate para continuar.", 423);
}
async function records(db: PrismaClient, emailOrId: string, byId: boolean, slug?: string): Promise<RecordRow[]> {
  const filter=byId ? "i.id::text=$1" : "lower(i.email)=lower($1)";
  const whereSlug=slug ? "AND t.slug=$2" : "";
  return db.$queryRawUnsafe<RecordRow[]>(`
    SELECT i.id::text,i.email,i.full_name,i.password_hash,i.enabled AS identity_enabled,
      t.id::text AS tenant_id,t.slug,t.state AS tenant_state,
      m.enabled AS member_enabled,m.role AS platform_role,t.neon_project_id,t.encrypted_database_url,
      e.state AS license_state,e.trial_started_at,e.trial_ends_at,e.paid_through,e.grace_ends_at
    FROM platform_identities i
    JOIN platform_memberships m ON m.identity_id=i.id
    JOIN platform_tenants t ON t.id=m.tenant_id
    LEFT JOIN platform_entitlements e ON e.tenant_id=t.id
    WHERE ${filter} ${whereSlug}
    ORDER BY t.id LIMIT 3
  `,...slug?[emailOrId,slug]:[emailOrId]);
}
function userFrom(row: RecordRow): TenantSessionUser {
  return {id:row.id,name:row.full_name,email:row.email,role:mapRole(row.platform_role),
    tenantId:row.tenant_id,tenantSlug:row.slug,platformRole:row.platform_role,funcionarioId:null};
}
/** Tenant selection is verified against central membership; never trust session/user-supplied URLs. */
export async function loginSaas(email:string,password:string,tenantSlug:string|undefined): Promise<TenantSessionUser|null> {
  if (tenantSlug && (!VALID_SLUG.test(tenantSlug)||tenantSlug.length>60)) return null;
  const rows=await withControlPlane(db=>records(db,email,false,tenantSlug));
  // Never choose an arbitrary establishment for a multi-tenant identity.
  if(rows.length!==1) return null;
  const row=rows[0];
  const valid=await compare(password,row.password_hash);
  if(!valid || !row.identity_enabled || !row.member_enabled) return null;
  validateAccess(row);
  return userFrom(row);
}
/** Revalidate membership and license on EVERY operational request, even with a valid JWT. */
export async function validateSaasSession(identityId:string,tenantId:string): Promise<TenantSessionUser> {
  if(!/^[0-9a-f-]{36}$/i.test(identityId)||!/^[0-9a-f-]{36}$/i.test(tenantId))
    throw new BusinessError("Sessão inválida.",401);
  const rows=await withControlPlane(db=>records(db,identityId,true));
  const row=rows.find(r=>r.tenant_id===tenantId);
  validateAccess(row);
  return userFrom(row!);
}
export type TenantConnection = {
  id:string; state:"READY"; neonProjectId:string; encryptedDatabaseUrl:string;
};
export async function resolveSaasConnection(identityId:string,tenantId:string):Promise<TenantConnection> {
  const rows=await withControlPlane(db=>records(db,identityId,true));
  const row=rows.find(r=>r.tenant_id===tenantId);
  validateAccess(row);
  return {id:row!.tenant_id,state:"READY",neonProjectId:row!.neon_project_id!,
    encryptedDatabaseUrl:row!.encrypted_database_url!};
}
