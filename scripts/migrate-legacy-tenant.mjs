/**
 * Safe operational-data transfer for ONE existing car wash into a newly
 * provisioned Neon project. This file does not alter the central control plane.
 *
 * Requires local pg_dump and pg_restore (matching server major version).
 * Do not run from a public API request. DATABASE_URL values belong in secure
 * environment variables, not arguments, logs, commits or command history.
 */
import {spawnSync} from "node:child_process";
import {mkdtempSync,rmSync,statSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {PrismaClient} from "@prisma/client";

const source=process.env.LEGACY_DATABASE_URL;
const target=process.env.TENANT_DATABASE_URL;
if(!source||!target)throw new Error("Configure LEGACY_DATABASE_URL e TENANT_DATABASE_URL em ambiente seguro.");
const a=new URL(source),b=new URL(target);
if(!["postgresql:","postgres:"].includes(a.protocol)||!["postgresql:","postgres:"].includes(b.protocol)||
 !a.password||!b.password||a.hostname===b.hostname)
 throw new Error("A origem e o destino devem ser Neon independentes, com credenciais válidas.");
const src=new PrismaClient({datasources:{db:{url:source}}});
const dst=new PrismaClient({datasources:{db:{url:target}}});
const sql=`SELECT tablename::text AS name FROM pg_catalog.pg_tables
 WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename`;
async function counts(db){
 const names=await db.$queryRawUnsafe(sql);
 const result=new Map();
 for(const {name} of names){
  if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))throw new Error("Nome de tabela inesperado.");
  const [{total}]=await db.$queryRawUnsafe(`SELECT count(*)::integer AS total FROM public."${name}"`);
  result.set(name,total);
 }
 return result;
}
function postgresEnv(url){
 const u=new URL(url);
 return {...process.env,PGHOST:u.hostname,PGPORT:u.port||"5432",
  PGDATABASE:decodeURIComponent(u.pathname.slice(1)),PGUSER:decodeURIComponent(u.username),
  PGPASSWORD:decodeURIComponent(u.password),PGSSLMODE:"require"};
}
function command(exe,args,url){
 const result=spawnSync(exe,args,{env:postgresEnv(url),stdio:["ignore","ignore","pipe"],timeout:300000});
 if(result.error||result.status!==0)throw new Error(exe+" falhou; consulte os logs protegidos do operador.");
}
const tmp=mkdtempSync(join(tmpdir(),"ducha-legacy-"));
try {
 const before=await counts(src),empty=await counts(dst);
 if(!before.size||!before.has("Comanda")||!before.has("User")||!before.has("Configuracao"))
  throw new Error("A origem não é um banco operacional Ducha Elitte.");
 if([...empty.values()].some(n=>n!==0))throw new Error("Destino não está vazio; operação cancelada.");
 const differing=[...before.keys()].filter(name=>!empty.has(name));
 if(differing.length)throw new Error("Esquema de destino incompleto.");
 const snapshot=Object.fromEntries(before);
 console.log(JSON.stringify({mode:process.env.MIGRATION_APPLY==="YES"?"transfer":"dry-run",
  tableCounts:snapshot},null,2));
 if(process.env.MIGRATION_APPLY!=="YES"){
  console.log("Nenhuma alteração executada. Configure MIGRATION_APPLY=YES somente após backup e janela de migração.");
  process.exitCode=0;
 }else{
  const archive=join(tmp,"legacy-data.dump");
  command("pg_dump",["--format=custom","--data-only","--schema=public",
   "--exclude-table=public._prisma_migrations","--no-owner","--no-acl","--file",archive],source);
  if(statSync(archive).size<512)throw new Error("Backup inconsistente.");
  // pg_restore --single-transaction aborts all writes if any row fails.
  command("pg_restore",["--data-only","--single-transaction","--exit-on-error",
   "--no-owner","--no-acl","--dbname",decodeURIComponent(b.pathname.slice(1)),archive],target);
  const after=await counts(dst);
  for(const [table,count] of before){
   if(after.get(table)!==count)throw new Error("Divergência após restauração: "+table);
  }
  console.log("Cópia concluída e contagens iguais. Não ativar login até validar registros, vinculações e hashes de usuários no controle central.");
 }
}finally{
 await src.$disconnect();await dst.$disconnect();
 rmSync(tmp,{recursive:true,force:true});
}
