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
  const name="ducha-tenant-"+tenantId;
  const response=await fetch("https://console.neon.tech/api/v2/projects",{
    method:"POST",
    headers:{"authorization":"Bearer "+apiKey,"accept":"application/json","content-type":"application/json"},
    body:JSON.stringify({project:{name,region_id:"aws-sa-east-1",pg_version:18}})
  });
  if(!response.ok){
    // Never print API response: might contain credentials, auth data, or billing metadata.
    throw new Error("Neon recusou provisionamento ("+response.status+"). Reconciliar manualmente antes de repetir.");
  }
  const payload=await response.json() as {
    project?:{id?:string},
    connection_uris?:Array<{connection_uri?:string;connection_uri_with_pooler?:string}>
  };
  const projectId=payload.project?.id;
  const uri=payload.connection_uris?.[0]?.connection_uri_with_pooler ||
            payload.connection_uris?.[0]?.connection_uri;
  if(!projectId || !uri)throw new Error("Projeto criado sem credenciais reconhecidas: verificar painel Neon e não repetir POST.");
  return {projectId,encryptedUrl:encryptTenantDatabaseUrl(uri),projectName:name};
}
