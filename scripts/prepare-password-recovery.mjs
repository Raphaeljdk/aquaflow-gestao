import {PrismaClient} from "@prisma/client";
export async function preparePasswordRecovery(){
 if(process.env.VERCEL_ENV!=="production")return;
 const central=process.env.CONTROL_DATABASE_URL;
 const operational=process.env.DATABASE_URL??process.env.NEON_DATABASE_URL??process.env.POSTGRES_PRISMA_URL??process.env.POSTGRES_URL;
 if(!central||!operational)throw new Error("Recuperação: conexões obrigatórias ausentes.");
 const a=new URL(central),b=new URL(operational);
 if(a.hostname===b.hostname)throw new Error("Recuperação: controle central e banco operacional devem ser isolados.");
 const db=new PrismaClient({datasources:{db:{url:central}}});
 try{
  const tables=await db.$queryRawUnsafe(
   "SELECT to_regclass('public.platform_tenants')::text AS tenants, to_regclass('public.platform_identities')::text AS identities"
  );
  if(!tables[0]?.tenants||!tables[0]?.identities)throw new Error("Recuperação: controle central inválido.");
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS platform_password_recovery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE,
    account_kind TEXT NOT NULL CHECK(account_kind IN ('LEGACY','SAAS')),
    account_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await db.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS platform_password_recovery_expires ON platform_password_recovery(expires_at)");
  console.log("[password-recovery] Estrutura segura de recuperação confirmada no controle central.");
 }finally{await db.$disconnect();}
}
await preparePasswordRecovery();
