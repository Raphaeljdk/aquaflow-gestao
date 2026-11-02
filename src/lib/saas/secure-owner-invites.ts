import "server-only";
import {createCipheriv,createDecipheriv,randomBytes,createHash} from "node:crypto";
import type {Prisma} from "@prisma/client";

/** Invitation links contain a bearer token. Only encrypted versions are stored in outbox. */
function key():Buffer {
 const input=process.env.TENANT_DB_ENCRYPTION_KEY;
 if(!input)throw new Error("Chave de segurança de convites indisponível.");
 const k=Buffer.from(input,"base64");
 if(k.length!==32)throw new Error("Chave de convites inválida.");
 return k;
}
export function encryptInvitationLink(link:string) {
 if(!link.startsWith("https://www.duchaelitte.com.br/convite?token="))
  throw new Error("Destino de convite inválido.");
 const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv);
 const ciphertext=Buffer.concat([cipher.update(link,"utf8"),cipher.final()]);
 return [iv,cipher.getAuthTag(),ciphertext].map(b=>b.toString("base64url")).join(".");
}
export function decryptInvitationLink(value:string) {
 const parts=value.split(".").map(b=>Buffer.from(b,"base64url"));
 if(parts.length!==3||parts[0].length!==12||parts[1].length!==16)
  throw new Error("Convite criptografado inválido.");
 const decipher=createDecipheriv("aes-256-gcm",key(),parts[0]);
 decipher.setAuthTag(parts[1]);
 const link=Buffer.concat([decipher.update(parts[2]),decipher.final()]).toString("utf8");
 if(!link.startsWith("https://www.duchaelitte.com.br/convite?token="))
  throw new Error("Destino de convite incompatível.");
 return link;
}
export type InviteReason="PAID"|"TRIAL";
/** Invoked inside the settlement or provisioning transaction. Never expose token in logs. */
export async function queueOwnerInvitation(tx:Prisma.TransactionClient,tenantId:string,reason:InviteReason) {
 const rows=await tx.$queryRaw<Array<{
  state:string;email:string;phone:string|null;entitlement:string|null;paid_through:Date|null;
  existing_owner:number;valid_invites:number;is_trial:boolean;
 }>>`
  SELECT t.state,t.owner_email AS email,t.owner_whatsapp AS phone,
   e.state AS entitlement,e.paid_through,
   (SELECT count(*)::int FROM platform_memberships m
     WHERE m.tenant_id=t.id AND m.role='OWNER' AND m.enabled) AS existing_owner,
   (SELECT count(*)::int FROM platform_invitations i
     WHERE i.tenant_id=t.id AND i.role='OWNER' AND i.used_at IS NULL AND i.expires_at>now()) AS valid_invites,
   EXISTS(SELECT 1 FROM platform_audit_events a WHERE a.tenant_id=t.id
      AND ((a.action='saas_signup_requested' AND a.metadata->>'kind'='TESTE_7_DIAS')
           OR a.action='qa_trial_requested')) AS is_trial
  FROM platform_tenants t JOIN platform_entitlements e ON e.tenant_id=t.id
  WHERE t.id=${tenantId}::uuid FOR UPDATE OF t`;
 const t=rows[0];
 if(!t||t.state!=="READY")throw new Error("Empresa ainda não provisionada.");
 if(t.existing_owner>0||t.valid_invites>0)return {queued:false};
 if(reason==="PAID" && (t.entitlement!=="ACTIVE"||!t.paid_through||t.paid_through<=new Date()))
  throw new Error("Licença paga não confirmada.");
 if(reason==="TRIAL" && (!t.is_trial||t.entitlement!=="PENDING"))
  return {queued:false};
 const token=randomBytes(32).toString("base64url");
 const digest=createHash("sha256").update(token).digest("hex");
 const url=encryptInvitationLink("https://www.duchaelitte.com.br/convite?token="+token);
 const invitation=await tx.$queryRaw<Array<{id:string}>>`
  INSERT INTO platform_invitations(tenant_id,email,role,token_hash,expires_at)
  VALUES(${tenantId}::uuid,${t.email.toLowerCase().trim()},'OWNER',${digest},now()+INTERVAL '48 hours')
  RETURNING id::text`;
 const id=invitation[0]?.id;
 if(!id)throw new Error("Falha ao registrar convite.");
 const payload=JSON.stringify({encryptedUrl:url,reason});
 await tx.$executeRaw`
  INSERT INTO platform_notification_outbox
   (tenant_id,channel,recipient,template_key,dedupe_key,payload)
  VALUES(${tenantId}::uuid,'EMAIL',${t.email},'owner_invite',${"invite:"+id+":email"},${payload}::jsonb)
  ON CONFLICT(dedupe_key) DO NOTHING`;
 if(t.phone){
  await tx.$executeRaw`
   INSERT INTO platform_notification_outbox
    (tenant_id,channel,recipient,template_key,dedupe_key,payload)
   VALUES(${tenantId}::uuid,'WHATSAPP',${t.phone},'owner_invite',${"invite:"+id+":whatsapp"},${payload}::jsonb)
   ON CONFLICT(dedupe_key) DO NOTHING`;
 }
 await tx.$executeRaw`
  INSERT INTO platform_audit_events(tenant_id,action,metadata)
  VALUES(${tenantId}::uuid,'owner_invitation_queued',${JSON.stringify({inviteId:id,reason})}::jsonb)`;
 return {queued:true};
}
