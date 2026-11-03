import "server-only";
import {withControlPlane} from "./control-plane";
import {createNeonTenantProject} from "./neon-provisioner";
import {decryptTenantDatabaseUrl} from "./database-secrets";
import {migrateNewTenantDatabase} from "./tenant-migrations";
import {queueOwnerInvitation} from "./secure-owner-invites";

/** Claim only a PENDING job; stalled RUNNING is inspected manually to avoid duplicate Neon projects. */
export async function processOneProvisioningJob(tenantFilter?:string) {
 if(tenantFilter && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantFilter))
   throw new Error("Identificador de empresa inválido.");
 const claimed=await withControlPlane(db=>db.$transaction(async tx=>{
  const rows=await tx.$queryRaw<Array<{id:string;tenant_id:string}>>`
   SELECT j.id::text,j.tenant_id::text FROM platform_provisioning_jobs j
   JOIN platform_tenants t ON t.id=j.tenant_id
   WHERE j.state='PENDING' AND t.state='PROVISIONING' AND t.neon_project_id IS NULL
     AND (${tenantFilter??null}::uuid IS NULL OR j.tenant_id=${tenantFilter??null}::uuid)
   ORDER BY j.created_at FOR UPDATE OF j SKIP LOCKED LIMIT 1`;
  if(!rows.length)return null;
  const job=rows[0];
  await tx.$executeRaw`UPDATE platform_provisioning_jobs SET state='RUNNING',
    attempts=attempts+1 WHERE id=${job.id}::uuid AND state='PENDING'`;
  return job;
 }));
 if(!claimed)return {processed:false};
 const jobId=claimed.id,tenantId=claimed.tenant_id;
 try {
  // Never repeat project creation after an ambiguous timeout.
  const project=await createNeonTenantProject(tenantId);
  await withControlPlane(db=>db.$transaction(async tx=>{
   const before=await tx.$queryRaw<Array<{state:string;neon_project_id:string|null}>>`
    SELECT state,neon_project_id FROM platform_tenants WHERE id=${tenantId}::uuid FOR UPDATE`;
   if(before[0]?.state!=="PROVISIONING"||before[0]?.neon_project_id)
    throw new Error("Empresa foi alterada durante provisionamento.");
   await tx.$executeRaw`
    UPDATE platform_tenants
    SET neon_project_id=${project.projectId},
      encrypted_database_url=${project.encryptedUrl},updated_at=now()
    WHERE id=${tenantId}::uuid`;
  }));
  const uri=decryptTenantDatabaseUrl(project.encryptedUrl);
  const result=await migrateNewTenantDatabase(uri);
  if(!result.ready)throw new Error("Esquema operacional não validado.");
  await withControlPlane(db=>db.$transaction(async tx=>{
   await tx.$executeRaw`UPDATE platform_tenants SET state='READY',updated_at=now()
      WHERE id=${tenantId}::uuid AND state='PROVISIONING' AND neon_project_id=${project.projectId}`;
   await tx.$executeRaw`UPDATE platform_provisioning_jobs SET state='DONE',last_error=NULL
      WHERE id=${jobId}::uuid AND state='RUNNING'`;
   await tx.$executeRaw`INSERT INTO platform_audit_events(tenant_id,action,metadata)
      VALUES(${tenantId}::uuid,'tenant_database_ready','{"worker":"neon_v1"}'::jsonb)`;
   await queueOwnerInvitation(tx,tenantId,"TRIAL");
  }));
  return {processed:true,ready:true};
 }catch{
  // Retain encrypted URL/project ID on failure; no automatic retries of an unknown POST outcome.
  await withControlPlane(db=>db.$transaction(async tx=>{
   await tx.$executeRaw`UPDATE platform_tenants SET state='ERROR',updated_at=now()
     WHERE id=${tenantId}::uuid AND state='PROVISIONING'`;
   await tx.$executeRaw`UPDATE platform_provisioning_jobs SET state='ERROR',last_error='manual_reconciliation_required'
     WHERE id=${jobId}::uuid AND state='RUNNING'`;
   await tx.$executeRaw`INSERT INTO platform_audit_events(tenant_id,action,metadata)
     VALUES(${tenantId}::uuid,'tenant_provisioning_failed','{"requires_manual_review":true}'::jsonb)`;
  }));
  return {processed:true,ready:false,manualReview:true};
 }
}
