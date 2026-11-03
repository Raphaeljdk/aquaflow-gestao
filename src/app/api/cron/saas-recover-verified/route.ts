import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {PrismaClient} from "@prisma/client";
import {withControlPlane} from "@/lib/saas/control-plane";
import {encryptTenantDatabaseUrl} from "@/lib/saas/database-secrets";
import {queueOwnerInvitation} from "@/lib/saas/secure-owner-invites";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;

// One-time recovery for the approved trial, using a pre-created, verified Neon
// project. Never retries a Neon POST or touches the legacy operational database.
const tenantId="62e37443-8892-42ba-827f-2ab8a3d22aa7";
const projectId="sweet-cake-88864404";
const expectedHost="ep-young-snow-b67qh38j-pooler.c-2.sa-east-1.aws.neon.tech";

function authorized(req:NextRequest){
 const secret=process.env.CRON_SECRET;
 const token=req.headers.get("authorization")?.replace(/^Bearer /,"")??"";
 if(!secret||!token)return false;
 const a=Buffer.from(secret),b=Buffer.from(token);
 return a.length===b.length&&timingSafeEqual(a,b);
}

export async function GET(request:NextRequest){
 if(!authorized(request))return NextResponse.json({error:"Não autorizado."},{status:401});
 if(process.env.VERCEL_ENV!=="production"||
    process.env.SAAS_PRODUCTION_MODE==="true"||
    process.env.STRIPE_BILLING_ENABLED==="true")
   return NextResponse.json({recovered:false,reason:"Modo de recuperação indisponível."},{status:503});

 const connection=process.env.SAAS_RECOVERY_DATABASE_URL;
 if(!connection)return NextResponse.json({recovered:false,reason:"Banco de recuperação não configurado."},{status:503});
 let uri:URL;
 try{uri=new URL(connection)}catch{return NextResponse.json({error:"Conexão de recuperação inválida."},{status:503})}
 const control=new URL(process.env.CONTROL_DATABASE_URL||"postgresql://localhost/central");
 const legacy=new URL(process.env.DATABASE_URL||process.env.NEON_DATABASE_URL||"postgresql://localhost/legacy");
 if(!["postgresql:","postgres:"].includes(uri.protocol)||
    uri.hostname!==expectedHost||uri.pathname!=="/neondb"||!uri.username||!uri.password||
    uri.searchParams.get("sslmode")!=="require"||
    new Set([uri.hostname,control.hostname,legacy.hostname]).size!==3)
   return NextResponse.json({error:"Banco exclusivo não corresponde ao projeto aprovado."},{status:503});

 const isolated=new PrismaClient({datasources:{db:{url:connection}},log:["error"]});
 try{
  const verified=await isolated.$queryRaw<Array<{total:number;broken:number;users:number;comandas:number;configuracoes:number;tables:number}>>`
   SELECT (SELECT count(*)::int FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS total,
     (SELECT count(*)::int FROM "_prisma_migrations" WHERE finished_at IS NULL) AS broken,
     (SELECT count(*)::int FROM "User") AS users,
     (SELECT count(*)::int FROM "Comanda") AS comandas,
     (SELECT count(*)::int FROM "Configuracao") AS configuracoes,
     (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name <> '_prisma_migrations') AS tables`;
  const shape=verified[0];
  if(!shape||shape.total!==15||shape.broken!==0||
     shape.users!==0||shape.comandas!==0||shape.configuracoes!==0||shape.tables!==18)
   return NextResponse.json({error:"Esquema exclusivo divergente. Nenhuma licença alterada."},{status:503});

  const encrypted=encryptTenantDatabaseUrl(connection);
  const result=await withControlPlane(db=>db.$transaction(async tx=>{
   const rows=await tx.$queryRaw<Array<{id:string;state:string;neon_project_id:string|null;
      has_url:boolean;job_id:string;job_state:string;entitlement:string;trial_count:number}>>`
    SELECT t.id::text,t.state,t.neon_project_id,
      (t.encrypted_database_url IS NOT NULL) AS has_url,
      j.id::text AS job_id,j.state AS job_state,e.state AS entitlement,
      (SELECT count(*)::int FROM platform_audit_events a
       WHERE a.tenant_id=t.id AND a.action='saas_signup_requested'
         AND a.metadata->>'kind'='TESTE_7_DIAS') AS trial_count
    FROM platform_tenants t
    JOIN platform_provisioning_jobs j ON j.tenant_id=t.id
    JOIN platform_entitlements e ON e.tenant_id=t.id
    WHERE t.id=${tenantId}::uuid FOR UPDATE OF t,j`;
   const current=rows[0];
   if(!current)return {recovered:false,reason:"Empresa de teste não cadastrada."};
   if(current.state==="READY"&&current.neon_project_id===projectId&&current.has_url)
    return {recovered:true,alreadyReady:true};
   if(current.state!=="ERROR"||current.job_state!=="ERROR"||
      current.neon_project_id||current.has_url||current.entitlement!=="PENDING"||
      current.trial_count!==1)
    return {recovered:false,reason:"Situação exige análise manual, sem alterações."};
   const other=await tx.$queryRaw<Array<{total:number}>>`
    SELECT count(*)::int AS total FROM platform_tenants
    WHERE neon_project_id=${projectId} AND id<>${tenantId}::uuid`;
   if(other[0]?.total)throw new Error("Projeto já vinculado a outra empresa.");
   await tx.$executeRaw`UPDATE platform_tenants SET state='READY',
      neon_project_id=${projectId},encrypted_database_url=${encrypted},updated_at=now()
      WHERE id=${tenantId}::uuid AND state='ERROR'`;
   await tx.$executeRaw`UPDATE platform_provisioning_jobs SET
      state='DONE',last_error=NULL WHERE id=${current.job_id}::uuid AND state='ERROR'`;
   await tx.$executeRaw`INSERT INTO platform_audit_events(tenant_id,action,metadata)
    VALUES(${tenantId}::uuid,'tenant_recovered_from_verified_project',
      '{"project":"sweet-cake-88864404","migrations":15,"isolated":true}'::jsonb)`;
   await queueOwnerInvitation(tx,tenantId,"TRIAL");
   return {recovered:true,projectLinked:true,invitationQueued:true};
  }));
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  // Do not write connection strings, passwords, e-mail tokens or provider responses to logs.
  console.error("[saas-recovery] Recuperação indisponível; verificar esquema e banco central.");
  return NextResponse.json({error:"Recuperação não concluída; revisão administrativa necessária."},{status:503});
 }finally{await isolated.$disconnect();}
}
