import "server-only";
import { PrismaClient } from "@prisma/client";
import { withControlPlane } from "@/lib/saas/control-plane";
import { decryptTenantDatabaseUrl } from "@/lib/saas/database-secrets";
export type TenantWhatsappDB = {id:string; encryptedUrl:string};
/** Inclui apenas empresas READY e com licença vigente. Sem acesso a bancos expirados. */
export async function listarEmpresasWhatsapp():Promise<TenantWhatsappDB[]>{
  return withControlPlane(db=>db.$queryRaw<TenantWhatsappDB[]>`
    SELECT t.id::text AS id,t.encrypted_database_url AS "encryptedUrl"
    FROM platform_tenants t JOIN platform_entitlements e ON e.tenant_id=t.id
    WHERE t.state='READY' AND t.encrypted_database_url IS NOT NULL
      AND ((e.state='ACTIVE' AND e.paid_through>now())
       OR (e.state='TRIAL' AND e.trial_ends_at>now())
       OR (e.state='GRACE' AND e.grace_ends_at>now()))
    ORDER BY t.id LIMIT 2000`);
}
export async function comBancoEmpresaWhatsapp<T>(t:TenantWhatsappDB,fn:(db:PrismaClient)=>Promise<T>):Promise<T>{
  const url=decryptTenantDatabaseUrl(t.encryptedUrl);
  const db=new PrismaClient({datasources:{db:{url}},log:["error"]});
  try{return await fn(db);}finally{await db.$disconnect();}
}
