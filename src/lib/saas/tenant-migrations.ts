import "server-only";
import {createHash,randomUUID} from "node:crypto";
import {PrismaClient} from "@prisma/client";
import {tenantMigrationsPart1} from "./tenant-migration-data-part1";
import {tenantMigrationsPart2} from "./tenant-migration-data-part2";
export const tenantMigrations=[...tenantMigrationsPart1,...tenantMigrationsPart2] as const;

/** Split ordinary Prisma SQL while preserving quoted strings, identifiers and -- comments. */
export function splitTenantSql(sql:string):string[] {
 const statements:string[]=[];let current="",quote:"'"|'"'|null=null,comment=false;
 for(let i=0;i<sql.length;i++){
  const c=sql[i],next=sql[i+1];
  if(comment){current+=c;if(c==="\n")comment=false;continue;}
  if(quote){
   current+=c;
   if(c===quote){if(next===quote){current+=next;i++;}else quote=null;}
   continue;
  }
  if(c==="-"&&next==="-"){comment=true;current+=c+next;i++;continue;}
  if(c==="'"||c==='"'){quote=c;current+=c;continue;}
  if(c===";"){
   if(current.replace(/--[^\n]*/g,"").trim())statements.push(current.trim());
   current="";continue;
  }
  current+=c;
 }
 if(quote)throw new Error("Aspas SQL não terminadas em migração.");
 if(current.replace(/--[^\n]*/g,"").trim())throw new Error("Migração com instrução sem terminador.");
 return statements;
}
/**
 * New Neon project only. A failed/incomplete migration leaves the tenant unready,
 * never retries DDL on partially modified schema without an operator review.
 */
export async function migrateNewTenantDatabase(uri:string) {
 const parsed=new URL(uri);
 if(!["postgresql:","postgres:"].includes(parsed.protocol)||!parsed.password||
    !parsed.hostname||!parsed.pathname||parsed.searchParams.get("sslmode")!=="require")
  throw new Error("Conexão operacional segura inválida.");
 const db=new PrismaClient({datasources:{db:{url:uri}},log:["error"]});
 try{
  const rows=await db.$queryRaw<Array<{n:number}>>`
    SELECT count(*)::integer AS n FROM information_schema.tables
    WHERE table_schema='public' AND table_name <> '_prisma_migrations'`;
  if(rows[0]?.n!==0)throw new Error("Banco de nova empresa não está vazio.");
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    finished_at TIMESTAMPTZ,
    migration_name VARCHAR(255) NOT NULL,
    logs TEXT,
    rolled_back_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_steps_count INTEGER NOT NULL DEFAULT 0
  )`);
  for(const item of tenantMigrations){
   const checksum=createHash("sha256").update(item.sql).digest("hex");
   const prior=await db.$queryRaw<Array<{checksum:string;finished_at:Date|null}>>`
    SELECT checksum,finished_at FROM "_prisma_migrations" WHERE migration_name=${item.name}`;
   if(prior.length){
    if(prior.length!==1||!prior[0].finished_at||prior[0].checksum!==checksum)
      throw new Error("Migração parcial ou divergente: revisão manual necessária.");
    continue;
   }
   const id=randomUUID(),statements=splitTenantSql(item.sql);
   await db.$executeRaw`INSERT INTO "_prisma_migrations" (id,checksum,migration_name)
     VALUES (${id},${checksum},${item.name})`;
   for(const statement of statements)await db.$executeRawUnsafe(statement);
   await db.$executeRaw`UPDATE "_prisma_migrations"
    SET finished_at=now(),applied_steps_count=${statements.length}
    WHERE id=${id}`;
  }
  const shape=await db.$queryRaw<Array<{a:string|null;b:string|null;c:string|null;d:string|null}>>`
    SELECT to_regclass('public."User"')::text AS a,
      to_regclass('public."Comanda"')::text AS b,
      to_regclass('public."Configuracao"')::text AS c,
      to_regclass('public."ChamadoSuporte"')::text AS d`;
  if(!shape[0]?.a||!shape[0]?.b||!shape[0]?.c||!shape[0]?.d)
   throw new Error("Esquema operacional incompleto.");
  const applied=await db.$queryRaw<Array<{n:number}>>`
    SELECT count(*)::integer AS n FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  if(applied[0]?.n!==tenantMigrations.length)throw new Error("Migrações incompletas.");
  return {applied:applied[0].n,ready:true};
 }finally{await db.$disconnect();}
}
