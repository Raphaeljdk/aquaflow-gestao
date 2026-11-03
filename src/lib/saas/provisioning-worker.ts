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
   // Self-service trials start ONLY after email confirmation AND isolated DB readiness.
   const started=await tx.$queryRaw<Array<{trial_ends_at:Date}>>`
      UPDATE platform_entitlements SET state='TRIAL',trial_started_at=now(),
        trial_ends_at=now()+INTERVAL '168 hours',updated_at=now()
      WHERE tenant_id=${tenantId}::uuid AND state='PENDING' AND trial_started_at IS NULL
        AND EXISTS(SELECT 1 FROM platform_memberships m
          WHERE m.tenant_id=${tenantId}::uuid AND m.role='OWNER' AND m.enabled)
        AND EXISTS(SELECT 1 FROM platform_audit_events a
          WHERE a.tenant_id=${tenantId}::uuid AND a.action='saas_signup_requested'
            AND a.metadata->>'kind'='TESTE_7_DIAS')
      RETURNING trial_ends_at`;
   if(started.length){
     const owner=await tx.$queryRaw<Array<{email:string}>>`
       SELECT owner_email AS email FROM platform_tenants WHERE id=${tenantId}::uuid`;
     if(owner[0]){
       await tx.$executeRaw`INSERT INTO platform_notification_outbox
         (tenant_id,channel,recipient,template_key,dedupe_key,payload)
         VALUES(${tenantId}::uuid,'EMAIL',${owner[0].email},'tenant_ready',${"ready:"+tenantId},'{}'::jsonb)
         ON CONFLICT(dedupe_key) DO NOTHING`;
     }
     await tx.$executeRaw`INSERT INTO platform_audit_events(tenant_id,action)
       VALUES(${tenantId}::uuid,'self_service_trial_started_after_db_ready')`;
   }
   await queueOwnerInvitation(tx,tenantId,"TRIAL");
  }));
  return {processed:true,ready:true};
 }catch(error){
  // Persist only a strictly whitelisted diagnostic code, never provider details or secrets.
  const detail=error instanceof Error?error.message:"";
  const match=detail.match(/^neon_(?:inventory_http|create_http)_([0-9]{3})$/);
  const code=match?detail:
   ["neon_project_exists_manual_reconciliation_required","neon_inventory_invalid","neon_inventory_incomplete"].includes(detail)
    ?detail:"manual_reconciliation_required";
  // Retain encrypted URL/project ID on failure; no automatic retries of an unknown POST outcome.
  await withControlPlane(db=>db.$transaction(async tx=>{
   await tx.$executeRaw`UPDATE platform_tenants SET state='ERROR',updated_at=now()
     WHERE id=${tenantId}::uuid AND state='PROVISIONING'`;
   await tx.$executeRaw`UPDATE platform_provisioning_jobs SET state='ERROR',last_error=${code}
     WHERE id=${jobId}::uuid AND state='RUNNING'`;
   await tx.$executeRaw`INSERT INTO platform_audit_events(tenant_id,action,metadata)
     VALUES(${tenantId}::uuid,'tenant_provisioning_failed',${JSON.stringify({requires_manual_review:true,code})}::jsonb)`;
  }));
  return {processed:true,ready:false,manualReview:true};
 }
}
