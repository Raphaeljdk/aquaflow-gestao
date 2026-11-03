import "server-only";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BusinessError } from "@/lib/domain";
import { withControlPlane } from "./control-plane";
import { decryptTenantDatabaseUrl } from "./database-secrets";
import { saasPilotMode } from "./identity";
import { publicSignupMode } from "./public-signup-mode";
import { effectiveState, type Entitlement } from "./entitlement";
const SAFE_SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Booking API is public, but must resolve an explicit, licensed tenant slug. */
export async function withPublicTenant<T>(request:Request,fn:(db:PrismaClient)=>Promise<T>):Promise<T> {
  const slug=new URL(request.url).searchParams.get("loja")??"";
  // Legacy public booking without a slug continues using the original database.
  if(!saasPilotMode() && (!publicSignupMode(process.env)||!slug))return fn(prisma);
  if(slug.length<3||slug.length>60||!SAFE_SLUG.test(slug))
    throw new BusinessError("Informe o endereço do estabelecimento.",400);
  const rows=await withControlPlane(db=>db.$queryRaw<Array<{
    state:string; neon_project_id:string|null;encrypted_database_url:string|null;
    license_state:Entitlement["state"]|null;trial_started_at:Date|null;trial_ends_at:Date|null;
    paid_through:Date|null;grace_ends_at:Date|null;
  }>>`SELECT t.state,t.neon_project_id,t.encrypted_database_url,e.state AS license_state,
      e.trial_started_at,e.trial_ends_at,e.paid_through,e.grace_ends_at
    FROM platform_tenants t LEFT JOIN platform_entitlements e ON e.tenant_id=t.id
    WHERE t.slug=${slug} LIMIT 1`);
  const t=rows[0];
  if(!t||t.state!=="READY"||!t.neon_project_id||!t.encrypted_database_url||!t.license_state)
    throw new BusinessError("Agendamento indisponível.",404);
  const status=effectiveState({state:t.license_state,trialStartedAt:t.trial_started_at,
    trialEndsAt:t.trial_ends_at,paidThrough:t.paid_through,graceEndsAt:t.grace_ends_at},new Date());
  if(!["TRIAL","ACTIVE","GRACE"].includes(status))throw new BusinessError("Agendamento indisponível.",423);
  const url=decryptTenantDatabaseUrl(t.encrypted_database_url);
  const legacy=process.env.DATABASE_URL, control=process.env.CONTROL_DATABASE_URL;
  const host=new URL(url).hostname;
  if((legacy&&host===new URL(legacy).hostname)||(control&&host===new URL(control).hostname))
    throw new BusinessError("Conexão não isolada.",503);
  const client=new PrismaClient({datasources:{db:{url}},log:["error"]});
  try{return await fn(client);}finally{await client.$disconnect();}
}
