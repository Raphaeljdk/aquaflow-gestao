import "server-only";
import type { PrismaClient } from "@prisma/client";

/** QA only. Never publish a license for a non-provisioned tenant. */
export type PilotStatus = {
  id: string; slug: string; state: string; license_state: string | null;
  members: number; has_database: boolean; trial_started_at: Date | null;
  trial_ends_at: Date | null;
};

export function assertPilotQaEnabled() {
  if (process.env.SAAS_QA_MODE !== "true")
    throw new Error("Ambiente de homologação SaaS não habilitado.");
}

export async function listPilotStatus(db: PrismaClient): Promise<PilotStatus[]> {
  return db.$queryRawUnsafe<PilotStatus[]>(`
    SELECT t.id::text, t.slug, t.state, e.state AS license_state,
           (t.neon_project_id IS NOT NULL AND t.encrypted_database_url IS NOT NULL) AS has_database,
           e.trial_started_at, e.trial_ends_at,
           (SELECT count(*)::integer FROM platform_memberships m
             JOIN platform_identities i ON i.id = m.identity_id
             WHERE m.tenant_id=t.id AND m.enabled=true AND i.enabled=true) AS members
    FROM platform_tenants t
    LEFT JOIN platform_entitlements e ON e.tenant_id=t.id
    ORDER BY t.slug LIMIT 50
  `);
}

/**
 * The same transaction locks the company and its entitlement. A trial is once-only,
 * begins at the DB clock and is never activated before an isolated DB and an owner.
 * This is a MANUAL QA transition, not an automatic provisioning worker.
 */
export async function activatePilotTrial(db: PrismaClient, tenantId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId))
    return { activated: false as const, reason: "invalid_id" as const };
  return db.$transaction(async (tx) => {
    const records = await tx.$queryRawUnsafe<Array<{
      state: string; license_state: string; trial_started_at: Date | null;
      trial_ends_at: Date | null; has_database: boolean; owners: number;
    }>>(`
      SELECT t.state, e.state AS license_state, e.trial_started_at, e.trial_ends_at,
             (t.neon_project_id IS NOT NULL AND t.encrypted_database_url IS NOT NULL) AS has_database,
             (SELECT count(*)::integer FROM platform_memberships m
               JOIN platform_identities i ON i.id=m.identity_id
               WHERE m.tenant_id=t.id AND m.enabled=true AND i.enabled=true AND m.role=\'OWNER\') AS owners
      FROM platform_tenants t
      JOIN platform_entitlements e ON e.tenant_id=t.id
      WHERE t.id=$1::uuid
      FOR UPDATE OF t,e
    `, tenantId);
    const r = records[0];
    if (!r || r.state !== "READY" || !r.has_database || r.owners < 1 ||
        r.license_state !== "PENDING" || r.trial_started_at || r.trial_ends_at)
      return { activated: false as const, reason: "not_ready_or_already_used" as const };
    const changed = await tx.$queryRawUnsafe<Array<{trial_ends_at: Date}>>(`
      UPDATE platform_entitlements SET state=\'TRIAL\',
        trial_started_at=now(), trial_ends_at=now()+INTERVAL \'168 hours\', updated_at=now()
      WHERE tenant_id=$1::uuid AND state=\'PENDING\'
      RETURNING trial_ends_at
    `, tenantId);
    if (!changed.length) throw new Error("Licença mudou durante ativação.");
    await tx.$executeRawUnsafe(`
      INSERT INTO platform_audit_events(tenant_id, action, metadata)
      VALUES ($1::uuid, \'trial_activated_qa\', \'{"source":"verified_platform_admin"}\'::jsonb)
    `, tenantId);
    return { activated: true as const, expiresAt: changed[0].trial_ends_at };
  });
}
