import "server-only";
import { randomBytes,createHash } from "node:crypto";
import { hash } from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { BusinessError } from "@/lib/domain";

export const invitationHash=(token:string)=>createHash("sha256").update(token).digest("hex");
const UUID=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;

export async function createOwnerInvitation(db:PrismaClient,tenantId:string) {
  if(!UUID.test(tenantId))throw new BusinessError("Empresa inválida.",400);
  return db.$transaction(async tx=>{
    const tenants=await tx.$queryRawUnsafe<Array<{email:string;state:string;db_ready:boolean}>>(`
      SELECT t.owner_email AS email,t.state,
       (t.neon_project_id IS NOT NULL AND t.encrypted_database_url IS NOT NULL) AS db_ready
      FROM platform_tenants t WHERE t.id=$1::uuid FOR UPDATE
    `,tenantId);
    const t=tenants[0];
    if(!t || t.state!=="READY" || !t.db_ready)throw new BusinessError("Banco individual ainda não está pronto.",409);
    const recent=await tx.$queryRawUnsafe<Array<{quantity:number}>>(`
      SELECT count(*)::integer AS quantity FROM platform_invitations
      WHERE tenant_id=$1::uuid AND created_at>now()-INTERVAL '24 hours'
    `,tenantId);
    if((recent[0]?.quantity??0)>=3)throw new BusinessError("Limite de convites deste estabelecimento atingido.",429);
    const token=randomBytes(32).toString("base64url");
    const digest=invitationHash(token);
    await tx.$executeRawUnsafe(`
      UPDATE platform_invitations SET expires_at=now()
      WHERE tenant_id=$1::uuid AND role='OWNER' AND used_at IS NULL
    `,tenantId);
    await tx.$executeRawUnsafe(`
      INSERT INTO platform_invitations(tenant_id,email,role,token_hash,expires_at)
      VALUES($1::uuid,$2,'OWNER',$3,now()+INTERVAL '24 hours')
    `,tenantId,t.email.toLowerCase().trim(),digest);
    return {token,email:t.email,expiresInHours:24};
  });
}

export async function acceptOwnerInvitation(db:PrismaClient,token:string,password:string) {
  if(!/^[A-Za-z0-9_-]{40,100}$/.test(token)||password.length<12||password.length>128||
    !/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password))
    throw new BusinessError("Convite ou senha inválidos. Utilize 12 caracteres com maiúscula, minúscula e número.",400);
  const digest=invitationHash(token);
  const hashed=await hash(password,12);
  return db.$transaction(async tx=>{
    const rows=await tx.$queryRawUnsafe<Array<{id:string;tenant_id:string;email:string;role:string;state:string;db_ready:boolean}>>(`
      SELECT v.id::text,v.tenant_id::text,v.email,v.role,t.state,
        (t.neon_project_id IS NOT NULL AND t.encrypted_database_url IS NOT NULL) AS db_ready
      FROM platform_invitations v JOIN platform_tenants t ON t.id=v.tenant_id
      WHERE v.token_hash=$1 AND v.used_at IS NULL AND v.expires_at>now()
      FOR UPDATE OF v,t
    `,digest);
    const item=rows[0];
    const pending=!!item && item.state==="PENDING" && !item.db_ready;
    const ready=!!item && item.state==="READY" && item.db_ready;
    if(!item || item.role!=="OWNER" || (!pending && !ready))
      throw new BusinessError("Convite expirado ou estabelecimento indisponível.",409);
    const exists=await tx.$queryRawUnsafe<Array<{id:string}>>(`
      SELECT id::text FROM platform_identities WHERE lower(email)=lower($1) LIMIT 1
    `,item.email);
    // Never silently reset an existing identity's password via tenant invitation.
    if(exists.length)throw new BusinessError("E-mail já cadastrado. Solicite acesso pelo suporte.",409);
    const owners=await tx.$queryRawUnsafe<Array<{quantity:number}>>(`
      SELECT count(*)::integer AS quantity FROM platform_memberships
      WHERE tenant_id=$1::uuid AND role='OWNER' AND enabled=true
    `,item.tenant_id);
    if((owners[0]?.quantity??0)>0)throw new BusinessError("Proprietário já ativado.",409);
    const identities=await tx.$queryRawUnsafe<Array<{id:string}>>(`
      INSERT INTO platform_identities(email,password_hash,full_name)
      SELECT lower(t.owner_email),$1,t.display_name FROM platform_tenants t WHERE t.id=$2::uuid
      RETURNING id::text
    `,hashed,item.tenant_id);
    const identityId=identities[0]?.id;
    if(!identityId)throw new BusinessError("Não foi possível ativar este acesso.",503);
    await tx.$executeRawUnsafe(`
      INSERT INTO platform_memberships(tenant_id,identity_id,role)
      VALUES($1::uuid,$2::uuid,'OWNER')
    `,item.tenant_id,identityId);
    if(pending) {
      // The invitation proves email ownership; only now create the expensive Neon job.
      const signup=await tx.$queryRawUnsafe<Array<{qty:number}>>(`
        SELECT count(*)::integer AS qty FROM platform_audit_events
        WHERE tenant_id=$1::uuid AND action='saas_signup_requested'
      `,item.tenant_id);
      if(!signup[0]?.qty)throw new BusinessError("Cadastro não verificado.",409);
      const updated=await tx.$queryRawUnsafe<Array<{id:string}>>(`
        UPDATE platform_tenants SET state='PROVISIONING',updated_at=now()
        WHERE id=$1::uuid AND state='PENDING' AND neon_project_id IS NULL
          AND encrypted_database_url IS NULL RETURNING id::text
      `,item.tenant_id);
      if(!updated.length)throw new BusinessError("Cadastro alterado durante ativação.",409);
      await tx.$executeRawUnsafe(`
        INSERT INTO platform_provisioning_jobs(tenant_id,idempotency_key,state)
        VALUES($1::uuid,$2,'PENDING') ON CONFLICT(tenant_id) DO NOTHING
      `,item.tenant_id,"neon-tenant:"+item.tenant_id);
      await tx.$executeRawUnsafe(`
        UPDATE platform_invitations SET used_at=now() WHERE id=$1::uuid
      `,item.id);
      await tx.$executeRawUnsafe(`
        INSERT INTO platform_audit_events(tenant_id,actor_identity_id,action)
        VALUES($1::uuid,$2::uuid,'owner_email_verified_provisioning_queued')
      `,item.tenant_id,identityId);
      return {activated:true,provisioning:true,paid:false,trialEndsAt:null};
    }
    const paidRows=await tx.$queryRawUnsafe<Array<{state:string;paid_through:Date|null}>>(`
      SELECT state,paid_through FROM platform_entitlements WHERE tenant_id=$1::uuid FOR UPDATE
    `,item.tenant_id);
    const paid=paidRows[0]?.state==="ACTIVE" && !!paidRows[0]?.paid_through && paidRows[0].paid_through>new Date();
    if(!paid){
      const trialAudit=await tx.$queryRawUnsafe<Array<{qty:number}>>(`
        SELECT count(*)::integer AS qty FROM platform_audit_events
        WHERE tenant_id=$1::uuid AND
          (action='qa_trial_requested' OR
           (action='saas_signup_requested' AND metadata->>'kind'='TESTE_7_DIAS'))
      `,item.tenant_id);
      if(!trialAudit[0]?.qty)throw new BusinessError("Contrato exige pagamento antes da criação do acesso.",409);
    }
    const activated=paid?[]:await tx.$queryRawUnsafe<Array<{trial_ends_at:Date}>>(`
      UPDATE platform_entitlements
      SET state='TRIAL',trial_started_at=now(),trial_ends_at=now()+INTERVAL '168 hours',updated_at=now()
      WHERE tenant_id=$1::uuid AND state='PENDING' AND trial_started_at IS NULL
      RETURNING trial_ends_at
    `,item.tenant_id);
    if(!paid && !activated.length)throw new BusinessError("Sem pagamento confirmado ou teste disponível.",409);
    await tx.$executeRawUnsafe(`UPDATE platform_invitations SET used_at=now() WHERE id=$1::uuid`,item.id);
    await tx.$executeRawUnsafe(`
      INSERT INTO platform_audit_events(tenant_id,actor_identity_id,action)
      VALUES($1::uuid,$2::uuid,'owner_invite_activated')
    `,item.tenant_id,identityId);
    return {activated:true,provisioning:false,paid,trialEndsAt:activated[0]?.trial_ends_at??null};
  });
}
