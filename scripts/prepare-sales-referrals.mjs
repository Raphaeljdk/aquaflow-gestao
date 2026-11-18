// Migração idempotente, somente no banco CENTRAL e apenas em produção.
// Nunca altera bancos dos lava-rápidos, nem migra usuários/licenças.
import {PrismaClient} from "@prisma/client";
if(process.env.VERCEL_ENV==="production"){
 const central=process.env.CONTROL_DATABASE_URL;
 const legacy=process.env.DATABASE_URL??process.env.NEON_DATABASE_URL;
 if(!central||!legacy)throw new Error("[sales-referrals] Conexões centrais obrigatórias ausentes.");
 const a=new URL(central),b=new URL(legacy);
 if(a.hostname===b.hostname)throw new Error("[sales-referrals] Banco central precisa estar isolado.");
 const db=new PrismaClient({datasources:{db:{url:central}}});
 try{
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS platform_sales_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE CHECK(code ~ '^ind-[0-9a-f]{12}$'),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS platform_sales_referrals (
    tenant_id UUID PRIMARY KEY REFERENCES platform_tenants(id) ON DELETE RESTRICT,
    partner_id UUID NOT NULL REFERENCES platform_sales_partners(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await db.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS platform_sales_referrals_partner_idx ON platform_sales_referrals(partner_id,created_at DESC)");
  console.log("[sales-referrals] Estrutura do programa de indicações confirmada no banco central.");
 }finally{await db.$disconnect();}
}
