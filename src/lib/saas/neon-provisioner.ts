import "server-only";
import { encryptTenantDatabaseUrl } from "./database-secrets";

/**
 * Creates the physical project, but intentionally does NOT mark it READY.
 * A separate migrator and health check must approve the operational schema.
 *
 * POST is not retried automatically after a network timeout: reconcile the
 * deterministic name first to avoid accidentally provisioning twice.
 */
export type ProvisionedProject={projectId:string;encryptedUrl:string;projectName:string};
export async function createNeonTenantProject(tenantId:string):Promise<ProvisionedProject>{
  if(!/^[0-9a-f-]{36}$/i.test(tenantId))throw new Error("Tenant ID inválido.");
  const apiKey=process.env.NEON_ORG_API_KEY;
  if(!apiKey)throw new Error("Chave da organização Neon ausente.");
  const orgId=process.env.NEON_ORG_ID;
  if(!orgId||!/^org-[a-z0-9-]+$/.test(orgId))throw new Error("Neon org_id não configurado.");
  const name="ducha-tenant-"+tenantId;
  // Inventory is a read-only reconciliation gate: a retry must not create duplicates.
  const inventory=await fetch("https://console.neon.tech/api/v2/projects?org_id="+encodeURIComponent(orgId),{
    headers:{"authorization":"Bearer "+apiKey,"accept":"application/json"},
    signal:AbortSignal.timeout(15000),cache:"no-store"
  });
  if(!inventory.ok)throw new Error("neon_inventory_http_"+inventory.status);
  const listing=await inventory.json() as {projects?:Array<{name?:string}>};
  if(listing.projects?.some(p=>p.name===name))
    throw new Error("neon_project_exists_manual_reconciliation_required");
  const response=await fetch("https://console.neon.tech/api/v2/projects",{
    method:"POST",
    headers:{"authorization":"Bearer "+apiKey,"accept":"application/json","content-type":"application/json"},
    body:JSON.stringify({project:{name,org_id:orgId,region_id:"aws-sa-east-1",pg_version:18}}),
    signal:AbortSignal.timeout(20000)
  });
  if(!response.ok){
    // Never print API response: might contain credentials, auth data, or billing metadata.
    throw new Error("neon_create_http_"+response.status);
  }
  const payload=await response.json() as {
    project?:{id?:string},
    connection_uris?:Array<{connection_uri?:string;connection_uri_with_pooler?:string}>
  };
  const projectId=payload.project?.id;
  const uri=payload.connection_uris?.[0]?.connection_uri ||
            payload.connection_uris?.[0]?.connection_uri_with_pooler;
  if(!projectId || !uri)throw new Error("Projeto criado sem credenciais reconhecidas: verificar painel Neon e não repetir POST.");
  return {projectId,encryptedUrl:encryptTenantDatabaseUrl(uri),projectName:name};
}
