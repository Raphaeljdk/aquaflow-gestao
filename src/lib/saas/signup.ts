import "server-only";
import { randomBytes } from "node:crypto";
import { queueOwnerInvitation } from "./secure-owner-invites";
import type { PrismaClient } from "@prisma/client";
import { BusinessError } from "@/lib/domain";

export function ownerSlug(displayName:string) {
 const base=displayName.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
   .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,43);
 if(base.length<3)throw new BusinessError("Nome do estabelecimento inválido.",400);
 return base+"-"+randomBytes(4).toString("hex");
}
type RequestInfo={nomeEmpresa:string;nomeResponsavel:string;email:string;whatsapp:string;kind?:"TESTE_7_DIAS"|"CONTRATACAO";plan?:string;method?:string;originHash?:string};
export async function registerTrialRequest(db:PrismaClient,info:RequestInfo) {
 const slug=ownerSlug(info.nomeEmpresa);
 const email=info.email.trim().toLowerCase();
 const number=info.whatsapp.replace(/\D/g,"");
 if(!email.includes("@") || !/^55\d{10,11}$/.test(number))
   throw new BusinessError("E-mail ou WhatsApp inválido.",400);
 return db.$transaction(async tx=>{
   // Serialize requests from the same contact and IP to prevent parallel resource abuse.
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${email}))`;
   if(info.originHash){
     await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${info.originHash}))`;
     const recent=await tx.$queryRaw<Array<{quantity:number}>>`
       SELECT count(*)::integer AS quantity FROM platform_audit_events
       WHERE action='saas_signup_requested' AND metadata->>'ip_hash'=${info.originHash}
         AND created_at>now()-INTERVAL '24 hours'`;
     if((recent[0]?.quantity??0)>=10)throw new BusinessError("Limite diário de cadastros atingido.",429);
   }
   const current=await tx.$queryRaw<Array<{quantity:number}>>`
     SELECT count(*)::integer AS quantity FROM platform_tenants
     WHERE lower(owner_email)=${email} AND created_at>now()-INTERVAL '24 hours'`;
   if((current[0]?.quantity??0)>0)throw new BusinessError("Já existe um pedido recente para este contato.",409);
   const rows=await tx.$queryRaw<Array<{id:string}>>`
      INSERT INTO platform_tenants(slug,display_name,owner_email,owner_whatsapp)
      VALUES(${slug},${info.nomeEmpresa.trim()},${email},${number})
      RETURNING id::text`;
   const tenantId=rows[0].id;
   await tx.$executeRaw`
      INSERT INTO platform_entitlements(tenant_id,state) VALUES(${tenantId}::uuid,'PENDING')`;
   await tx.$executeRaw`
      INSERT INTO platform_audit_events(tenant_id,action,metadata)
      VALUES(${tenantId}::uuid,'saas_signup_requested',${JSON.stringify({source:"website",kind:info.kind??"TESTE_7_DIAS",plan:info.plan??null,method:info.method??null,contactName:info.nomeResponsavel.trim().slice(0,80),ip_hash:info.originHash??null})}::jsonb)`;
   // The invitation verifies ownership of the email BEFORE any Neon project is created.
   await queueOwnerInvitation(tx,tenantId,"SIGNUP");
   return {id:tenantId,slug};
 });
}
/** Approval queues a durable job but never creates a project inside Vercel. */
export async function approveTrialRequest(db:PrismaClient,tenantId:string) {
 if(!/^[0-9a-f-]{36}$/i.test(tenantId))throw new BusinessError("Identificador inválido.",400);
 return db.$transaction(async tx=>{
   const rows=await tx.$queryRawUnsafe<Array<{id:string;state:string}>>(`
     SELECT id::text,state FROM platform_tenants WHERE id=$1::uuid FOR UPDATE
   `,tenantId);
   if(!rows[0]||rows[0].state!=="PENDING")
     throw new BusinessError("Cadastro já encaminhado ou inexistente.",409);
   await tx.$executeRawUnsafe(`
     UPDATE platform_tenants SET state='PROVISIONING',updated_at=now() WHERE id=$1::uuid
   `,tenantId);
   await tx.$executeRawUnsafe(`
     INSERT INTO platform_provisioning_jobs(tenant_id,idempotency_key,state)
     VALUES($1::uuid,$2,'PENDING') ON CONFLICT(tenant_id) DO NOTHING
   `,tenantId,"neon-tenant:"+tenantId);
   await tx.$executeRawUnsafe(`
     INSERT INTO platform_audit_events(tenant_id,action)
     VALUES($1::uuid,'qa_provisioning_approved')
   `,tenantId);
   return {queued:true,tenantId};
 });
}
