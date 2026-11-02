#!/usr/bin/env node
// Execute ONLY in a protected worker/CI environment. Never within the Vercel request lifecycle.
// DATABASE_URL from user/production is intentionally ignored. No secrets printed.
import { PrismaClient } from "@prisma/client";
import { randomBytes,createHash,createCipheriv } from "node:crypto";
import { spawnSync } from "node:child_process";

const controlUrl=process.env.CONTROL_DATABASE_URL;
const neonToken=process.env.NEON_ORG_API_KEY;
const encryptionKey=Buffer.from(process.env.TENANT_DB_ENCRYPTION_KEY??"","base64");
if(!controlUrl||!neonToken||encryptionKey.length!==32||
  !["postgresql:","postgres:"].includes(new URL(controlUrl).protocol))
  throw new Error("Worker QA não configurado com os segredos exigidos.");
if(process.env.SAAS_QA_MODE!=="true")
  throw new Error("Worker inativo fora do ambiente SaaS QA.");
if(process.env.DATABASE_URL && new URL(process.env.DATABASE_URL).hostname===new URL(controlUrl).hostname)
  throw new Error("Controle central não pode apontar para banco operacional.");
const central=new PrismaClient({datasources:{db:{url:controlUrl}},log:["error"]});
const apiRoot="https://console.neon.tech/api/v2";
const headers={Authorization:"Bearer "+neonToken,Accept:"application/json","Content-Type":"application/json"};
const nameOf=id=>"ducha-tenant-"+id;
async function api(path,init={}){
  const response=await fetch(apiRoot+path,{...init,headers,...(init.headers?{headers:{...headers,...init.headers}}:{})});
  if(!response.ok)throw new Error("API Neon indisponível ("+response.status+").");
  return response.json();
}
async function projectByName(name){
  // Neon supports server-side name filtering. Never issue another POST if a matching
  // project already exists, including after a previously timed-out POST.
  const r=await api("/projects?limit=400&search="+encodeURIComponent(name));
  const exact=(r.projects??[]).filter(p=>p.name===name);
  if(exact.length>1)throw new Error("Projetos duplicados detectados, requer revisão humana.");
  return exact[0]??null;
}
async function provisionNeon(id){
 const name=nameOf(id);
 let project=await projectByName(name);
 if(!project){
   const created=await api("/projects",{method:"POST",body:JSON.stringify({
     project:{name,region_id:"aws-sa-east-1",pg_version:18}
   })});
   project=created.project;
   if(!project?.id)throw new Error("Projeto possivelmente criado sem resposta; reconciliar antes de retry.");
 }
 // Always request the official direct connection from Neon, not a manually edited pooler hostname.
 const q="?database_name=neondb&role_name=neondb_owner&pooled=false";
 const connection=await api("/projects/"+encodeURIComponent(project.id)+"/connection_uri"+q);
 const url=connection.uri;
 if(!url||new URL(url).hostname===new URL(controlUrl).hostname)
   throw new Error("URL de banco de tenant inválida ou compartilhada.");
 return {id:project.id,url};
}
function encrypt(url){
 const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",encryptionKey,iv);
 const bytes=Buffer.concat([cipher.update(url,"utf8"),cipher.final()]);
 return [iv,cipher.getAuthTag(),bytes].map(b=>b.toString("base64url")).join(".");
}
async function migrateAndVerify(databaseUrl){
 const legacy=process.env.DATABASE_URL;
 if(legacy && new URL(databaseUrl).hostname===new URL(legacy).hostname)
   throw new Error("Worker tentou conectar banco legado.");
 const run=spawnSync(process.execPath,["node_modules/prisma/build/index.js","migrate","deploy"],{
   cwd:process.cwd(),env:{...process.env,DATABASE_URL:databaseUrl},
   timeout:180000,encoding:"utf8",maxBuffer:1024*1024,
 });
 if(run.status!==0)throw new Error("Prisma migrate deploy falhou. Verificar migrations no runner protegido.");
 const db=new PrismaClient({datasources:{db:{url:databaseUrl}},log:["error"]});
 try{
   const [tables,migrations]=await Promise.all([
      db.$queryRaw`SELECT count(*)::integer AS total FROM information_schema.tables
          WHERE table_schema='public' AND table_name IN ('User','Cliente','Comanda','Agendamento','Material','Configuracao')`,
      db.$queryRaw`SELECT count(*)::integer AS total FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
   ]);
   if((tables[0]?.total??0)!==6 || (migrations[0]?.total??0)<15)
     throw new Error("Schema operacional incompleto; não marcar tenant READY.");
 }finally{await db.$disconnect()}
}
async function claimOne(){
 return central.$transaction(async tx=>{
   const jobs=await tx.$queryRaw`
     SELECT j.id::text,j.tenant_id::text,t.slug,j.attempts
     FROM platform_provisioning_jobs j
     JOIN platform_tenants t ON t.id=j.tenant_id
     WHERE j.state='PENDING' AND t.state='PROVISIONING'
       AND (j.next_attempt_at IS NULL OR j.next_attempt_at<=now())
     ORDER BY j.created_at FOR UPDATE OF j,t SKIP LOCKED LIMIT 1`;
   const j=jobs[0];
   if(!j)return null;
   await tx.$executeRaw`
     UPDATE platform_provisioning_jobs SET state='RUNNING',attempts=attempts+1
     WHERE id=${j.id}::uuid AND state='PENDING'`;
   return j;
 });
}
async function finish(job,project){
 const encoded=encrypt(project.url);
 await central.$transaction(async tx=>{
   await tx.$executeRaw`
     UPDATE platform_tenants SET neon_project_id=${project.id},
       encrypted_database_url=${encoded},state='READY',updated_at=now()
     WHERE id=${job.tenant_id}::uuid AND state='PROVISIONING'`;
   await tx.$executeRaw`
     UPDATE platform_provisioning_jobs SET state='DONE',last_error=NULL
     WHERE id=${job.id}::uuid AND state='RUNNING'`;
   await tx.$executeRaw`
     INSERT INTO platform_audit_events(tenant_id,action)
     VALUES(${job.tenant_id}::uuid,'tenant_schema_verified_ready')`;
 });
}
async function invite(job){
 const from=process.env.NOTIFICATION_FROM_EMAIL;
 const key=process.env.RESEND_API_KEY;
 const origin=process.env.SAAS_APP_URL;
 if(!from||!key||!origin)return "Convite pendente: canal oficial de e-mail não configurado.";
 const originUrl=new URL(origin);
 if(originUrl.protocol!=="https:")throw new Error("SAAS_APP_URL precisa ser HTTPS.");
 const rows=await central.$queryRaw`
   SELECT owner_email FROM platform_tenants WHERE id=${job.tenant_id}::uuid AND state='READY'`;
 const email=rows[0]?.owner_email;
 if(!email)throw new Error("Destinatário não encontrado.");
 const token=randomBytes(32).toString("base64url");
 const digest=createHash("sha256").update(token).digest("hex");
 const link=originUrl.origin+"/convite?token="+encodeURIComponent(token);
 // Store the one-time token hash BEFORE sending the link. A failed provider send
 // can be replaced by the platform operator with a fresh invitation.
 await central.$executeRaw`
   INSERT INTO platform_invitations(tenant_id,email,role,token_hash,expires_at)
   VALUES(${job.tenant_id}::uuid,${email},'OWNER',${digest},now()+INTERVAL '24 hours')`;
 const response=await fetch("https://api.resend.com/emails",{
   method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
   body:JSON.stringify({from,to:[email],subject:"Ducha Elitte | Ative seu teste gratuito",
     text:"Seu ambiente exclusivo está pronto. Crie sua senha pelo link (válido por 24h): "+link+
          "\nOs 7 dias começam após a ativação. Nunca compartilhe sua senha."})
 });
 if(!response.ok)return "Convite não enviado: revise provedor de e-mail; solicite novo convite.";
 const delivered=await response.json();
 if(!delivered.id)return "Provedor não confirmou o e-mail.";

 return "Convite enviado ao proprietário.";
}
try{
 const job=await claimOne();
 if(!job){console.log("QA: nenhuma empresa aprovada aguardando provisionamento.");}
 else{
  try{
   const p=await provisionNeon(job.tenant_id);
   // NEVER mark READY until an official prisma migration and health verification succeed.
   await migrateAndVerify(p.url);
   await finish(job,p);
   console.log("QA: projeto isolado preparado e migrations verificadas. "+job.slug);
   // Manual QA invitation remains possible even when the email provider isn't ready.
   console.log(await invite(job));
  }catch(error){
   // A timeout during creation is ambiguous. Keep ERROR and require a human to
   // reconcile against GET /projects?search=name before retrying a POST.
   await central.$executeRaw`
     UPDATE platform_provisioning_jobs SET state='ERROR',last_error='Revisar logs e reconciliar projeto Neon'
     WHERE id=${job.id}::uuid AND state='RUNNING'`;
   await central.$executeRaw`
     UPDATE platform_tenants SET state='ERROR',updated_at=now()
     WHERE id=${job.tenant_id}::uuid AND state='PROVISIONING'`;
   console.error("QA: provisionamento interrompido sem expor credenciais.");
   process.exitCode=1;
  }
 }
}finally{await central.$disconnect()}
