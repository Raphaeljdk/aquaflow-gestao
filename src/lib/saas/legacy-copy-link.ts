import "server-only";
import {PrismaClient} from "@prisma/client";
import {prisma} from "@/lib/prisma";
import {withControlPlane} from "./control-plane";
import {encryptTenantDatabaseUrl} from "./database-secrets";

const TABLES=["User","Cliente","Veiculo","Servico","Funcionario","Comanda","ItemComanda",
 "Agendamento","AgendamentoServico","Configuracao","Material","MovimentoEstoque",
 "PedidoAgendamentoPublico","ChamadoSuporte","MensagemChamado"] as const;

/** Read-only fingerprints; never export personal data to HTTP or log.
 * Platform requests and partners are NOT copied to a tenant.
 */
async function fingerprints(db:PrismaClient) {
 const values:Record<string,{n:number;fingerprint:string}>={};
 for(const table of TABLES) {
  const rows=await db.$queryRawUnsafe<Array<{n:number;fingerprint:string}>>(
   `SELECT count(*)::integer AS n,
    md5(coalesce(string_agg(to_jsonb(t)::text,'|' ORDER BY to_jsonb(t)::text),'')) AS fingerprint
    FROM "${table}" t`);
  values[table]=rows[0];
 }
 return values;
}
const uuid=(v:string)=>/^[0-9a-f-]{36}$/i.test(v);

/** One-time central staging, safe to call repeatedly.
 * Does NOT enable login, grant a subscription, or switch databases.
 */
export async function linkVerifiedLegacyCopy(){
 if(process.env.VERCEL_ENV!=="production"||
   process.env.SAAS_PRODUCTION_MODE==="true"||
   process.env.STRIPE_BILLING_ENABLED==="true"||
   process.env.LEGACY_MIGRATION_LINK_ENABLED!=="true")
  throw new Error("Vínculo legado não autorizado neste ambiente.");
 const projectId=process.env.LEGACY_TENANT_MIGRATION_PROJECT_ID;
 const raw=process.env.LEGACY_TENANT_MIGRATION_URL;
 if(!projectId||!raw||!/^([a-z0-9]+-){2}[0-9]+$/.test(projectId))
  throw new Error("Projeto operacional de destino não configurado.");
 const dbUrl=new URL(raw);
 const oldUrl=process.env.DATABASE_URL;
 const centralUrl=process.env.CONTROL_DATABASE_URL;
 if(!oldUrl||!centralUrl||
    !["postgresql:","postgres:"].includes(dbUrl.protocol)||
    !dbUrl.password||!dbUrl.hostname.endsWith(".neon.tech")||
    dbUrl.searchParams.get("sslmode")!=="require"||
    [new URL(oldUrl).hostname,new URL(centralUrl).hostname].includes(dbUrl.hostname))
  throw new Error("Conexão individual não está isolada do controle central e do legado.");
 const copy=new PrismaClient({datasources:{db:{url:raw}},log:["error"]});
 try {
  const [source,target,sourceUsers,cloneUsers,sourceConfig,cloneConfig]=await Promise.all([
   fingerprints(prisma),fingerprints(copy),
   prisma.user.findMany({select:{email:true,name:true,password:true,role:true,ativo:true}}),
   copy.user.findMany({select:{email:true,name:true,password:true,role:true,ativo:true}}),
   prisma.configuracao.findUnique({where:{id:"empresa"},select:{nome:true}}),
   copy.configuracao.findUnique({where:{id:"empresa"},select:{nome:true}})
  ]);
  if(!sourceConfig||!cloneConfig||sourceConfig.nome!==cloneConfig.nome)
   throw new Error("Configuração da empresa divergente; interromper migração.");
  for(const name of TABLES){
   if(source[name].n!==target[name].n||
      source[name].fingerprint!==target[name].fingerprint)
    throw new Error("Dados alterados desde a cópia; sincronizar antes do vínculo: "+name);
  }
  if(sourceUsers.length!==cloneUsers.length||sourceUsers.length<2)
   throw new Error("Usuários divergentes na cópia.");
  const platformEmail=process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  if(!platformEmail)throw new Error("Operador central não configurado.");
  const adminUsers=cloneUsers.filter(u=>u.ativo&&u.role==="ADMIN"&&u.email.toLowerCase()!==platformEmail);
  if(adminUsers.length!==1)throw new Error("Um único administrador operacional deve ser identificado.");
  const owner=adminUsers[0];
  const members=cloneUsers.filter(u=>u.email.toLowerCase()!==platformEmail);
  if(members.length<1||members.some(u=>!/^\$2[aby]\$/.test(u.password)))
   throw new Error("Hashes dos usuários incompatíveis.");
  const ownerWhatsApp=await prisma.configuracao.findUnique({where:{id:"empresa"},select:{telefone:true}});
  const phone=(ownerWhatsApp?.telefone??"").replace(/\D/g,"");
  const encrypted=encryptTenantDatabaseUrl(raw);
  return withControlPlane(db=>db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('saas:legacy-copy:link'))`;
   const current=await tx.$queryRaw<Array<{id:string;state:string}>>`
    SELECT id::text,state FROM platform_tenants WHERE neon_project_id=${projectId}`;
   if(current.length)return {status:"ALREADY_LINKED" as const,tenantId:current[0].id};
   const operator=await tx.$queryRaw<Array<{qty:number}>>`
    SELECT count(*)::integer AS qty FROM platform_operators WHERE enabled=true`;
   const totals=await tx.$queryRaw<Array<{qty:number}>>`
    SELECT count(*)::integer AS qty FROM platform_tenants`;
   if(operator[0]?.qty!==1||totals[0]?.qty!==0)
    throw new Error("O controle central foi alterado; revisão manual necessária.");
   const conflicting=await tx.$queryRaw<Array<{qty:number}>>`
    SELECT count(*)::integer AS qty FROM platform_identities
    WHERE lower(email)=ANY(${members.map(u=>u.email.toLowerCase())}::text[])`;
   if(conflicting[0]?.qty)throw new Error("Conta central com e-mail duplicado.");
   const tenant=await tx.$queryRaw<Array<{id:string}>>`
    INSERT INTO platform_tenants(slug,display_name,owner_email,owner_whatsapp,neon_project_id,encrypted_database_url,state)
    VALUES('ducha-talento-legado',${cloneConfig.nome},${owner.email.toLowerCase()},
      ${phone||null},${projectId},${encrypted},'PROVISIONING')
    RETURNING id::text`;
   const tenantId=tenant[0]?.id;
   if(!tenantId||!uuid(tenantId))throw new Error("Não foi possível preparar empresa isolada.");
   await tx.$executeRaw`
    INSERT INTO platform_entitlements(tenant_id,state)VALUES(${tenantId}::uuid,'PENDING')`;
   for(const u of members){
    const role=u.role==="ADMIN"?"OWNER":u.role==="GERENTE"?"MANAGER":"EMPLOYEE";
    const users=await tx.$queryRaw<Array<{id:string}>>`
     INSERT INTO platform_identities(email,password_hash,full_name,enabled)
     VALUES(${u.email.toLowerCase()},${u.password},${u.name},${u.ativo}) RETURNING id::text`;
    await tx.$executeRaw`
     INSERT INTO platform_memberships(tenant_id,identity_id,role,enabled)
     VALUES(${tenantId}::uuid,${users[0].id}::uuid,${role},${u.ativo})`;
   }
   await tx.$executeRaw`
    INSERT INTO platform_audit_events(tenant_id,action,metadata)
    VALUES(${tenantId}::uuid,'legacy_snapshot_linked_pending_cutover',
      ${JSON.stringify({projectId,source:"legacy_operational",tableCounts:Object.fromEntries(Object.entries(target).map(([name,v])=>[name,v.n]))})}::jsonb)`;
   return {status:"STAGED" as const,tenantId,usersStaged:members.length,cutover:false};
  }));
 }finally{await copy.$disconnect();}
}
