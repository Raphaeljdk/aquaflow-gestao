import "server-only";
import {PrismaClient} from "@prisma/client";

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
 const apiKey=process.env.NEON_ORG_API_KEY;
 const centralUrl=process.env.CONTROL_DATABASE_URL;
 if(!apiKey||!centralUrl)throw new Error("Credenciais de controle e provisionamento ausentes.");
 const response=await fetch(
  "https://console.neon.tech/api/v2/projects/lingering-voice-54405395/connection_uri?database_name=neondb&role_name=neondb_owner&pooled=false",
  {headers:{"Authorization":"Bearer "+apiKey,"Accept":"application/json"},
   cache:"no-store",signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error("Neon recusou conexão à origem legada.");
 const originPayload=await response.json() as {uri?:string};
 if(!originPayload.uri)throw new Error("Origem legada indisponível.");
 const destUrl=new URL(raw),sourceUrl=new URL(originPayload.uri),controlUrl=new URL(centralUrl);
 if(!["postgresql:","postgres:"].includes(destUrl.protocol)||
    !["postgresql:","postgres:"].includes(sourceUrl.protocol)||
    !destUrl.password||!sourceUrl.password||
    !destUrl.hostname.endsWith(".neon.tech")||!sourceUrl.hostname.endsWith(".neon.tech")||
    destUrl.searchParams.get("sslmode")!=="require"||sourceUrl.searchParams.get("sslmode")!=="require"||
    new Set([destUrl.hostname,sourceUrl.hostname,controlUrl.hostname]).size!==3)
  throw new Error("Bancos operacional, novo e central não estão isolados.");
 const copy=new PrismaClient({datasources:{db:{url:raw}},log:["error"]});
 const origin=new PrismaClient({datasources:{db:{url:originPayload.uri}},log:["error"]});
 try {
 const [source,target,sourceUsers,cloneUsers,sourceConfig,cloneConfig]=await Promise.all([
   fingerprints(origin),fingerprints(copy),
   origin.user.findMany({select:{email:true,name:true,password:true,role:true,ativo:true}}),
   copy.user.findMany({select:{email:true,name:true,password:true,role:true,ativo:true}}),
   origin.configuracao.findUnique({where:{id:"empresa"},select:{nome:true}}),
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
  const ownerWhatsApp=await origin.configuracao.findUnique({where:{id:"empresa"},select:{telefone:true}});
  const phone=(ownerWhatsApp?.telefone??"").replace(/\D/g,"");
  const encrypted=encryptTenantDatabaseUrl(raw);
  return withControlPlane(db=>db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('saas:legacy-copy:link'))`;
   const current=await tx.$queryRaw<Array<{id:string;state:string;encrypted_database_url:string|null}>>`
    SELECT id::text,state,encrypted_database_url FROM platform_tenants
    WHERE neon_project_id=${projectId} OR slug='ducha-talento-legado' FOR UPDATE`;
   if(current.length>1)throw new Error("Vínculo duplicado; revisão manual necessária.");
   if(current[0]?.encrypted_database_url){
    const prior=await tx.$queryRaw<Array<{qty:number}>>`
     SELECT count(*)::integer AS qty FROM platform_memberships WHERE tenant_id=${current[0].id}::uuid`;
    if(prior[0]?.qty===members.length)return {status:"ALREADY_STAGED" as const,tenantId:current[0].id};
    throw new Error("Credencial existente com identidades incompletas.");
   }
   if(current[0]&&current[0].state!=="PROVISIONING")
    throw new Error("Estado incompatível com migração segura.");
   const operator=await tx.$queryRaw<Array<{qty:number}>>`
    SELECT count(*)::integer AS qty FROM platform_operators WHERE enabled=true`;
   if(operator[0]?.qty!==1)throw new Error("Operador central não validado.");
   const conflicting=await tx.$queryRaw<Array<{qty:number}>>`
    SELECT count(*)::integer AS qty FROM platform_identities
    WHERE lower(email)=ANY(${members.map(u=>u.email.toLowerCase())}::text[])`;
   if(conflicting[0]?.qty)throw new Error("Conta central com e-mail duplicado.");
   const tenant=current.length?await tx.$queryRaw<Array<{id:string}>>`
    UPDATE platform_tenants
    SET display_name=${cloneConfig.nome},owner_email=${owner.email.toLowerCase()},
      owner_whatsapp=${phone||null},encrypted_database_url=${encrypted},updated_at=now()
    WHERE id=${current[0].id}::uuid AND state='PROVISIONING'
      AND neon_project_id=${projectId} AND encrypted_database_url IS NULL RETURNING id::text`:
    await tx.$queryRaw<Array<{id:string}>>`
     INSERT INTO platform_tenants(slug,display_name,owner_email,owner_whatsapp,neon_project_id,encrypted_database_url,state)
     VALUES('ducha-talento-legado',${cloneConfig.nome},${owner.email.toLowerCase()},
       ${phone||null},${projectId},${encrypted},'PROVISIONING') RETURNING id::text`;
   const tenantId=tenant[0]?.id;
   if(!tenantId||!uuid(tenantId))throw new Error("Não foi possível preparar empresa isolada.");
   await tx.$executeRaw`
    INSERT INTO platform_entitlements(tenant_id,state)VALUES(${tenantId}::uuid,'PENDING') ON CONFLICT(tenant_id) DO NOTHING`;
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
 }finally{await copy.$disconnect();await origin.$disconnect();}
}
