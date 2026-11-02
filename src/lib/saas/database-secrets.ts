import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { authorizeOperationalAccess, type Entitlement } from "./entitlement";

/** Encrypted at rest. Never expose this value in logs, JSON or browser responses. */
function key():Buffer {
  const encoded=process.env.TENANT_DB_ENCRYPTION_KEY;
  if(!encoded)throw new Error("TENANT_DB_ENCRYPTION_KEY indisponível.");
  const value=Buffer.from(encoded,"base64");
  if(value.length!==32)throw new Error("Chave de criptografia deve ter 256 bits.");
  return value;
}
export function encryptTenantDatabaseUrl(url:string):string {
  const parsed=new URL(url);
  if(parsed.protocol!=="postgresql:" && parsed.protocol!=="postgres:")throw new Error("Banco deve usar Postgres.");
  const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv);
  const text=Buffer.concat([cipher.update(url,"utf8"),cipher.final()]);
  return [iv,cipher.getAuthTag(),text].map(v=>v.toString("base64url")).join(".");
}
export function decryptTenantDatabaseUrl(encrypted:string):string {
  const parts=encrypted.split(".");
  if(parts.length!==3)throw new Error("Credencial protegida inválida.");
  const [iv,tag,body]=parts.map(x=>Buffer.from(x,"base64url"));
  if(iv.length!==12 || tag.length!==16)throw new Error("Credencial protegida inválida.");
  const decipher=createDecipheriv("aes-256-gcm",key(),iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body),decipher.final()]).toString("utf8");
}
export type ReadyTenant={
  id:string;
  neonProjectId:string;
  encryptedDatabaseUrl:string;
  state:"READY"|"PENDING"|"PROVISIONING"|"SUSPENDED"|"ERROR";
};
export async function tenantDatabaseUrl(tenant:ReadyTenant,member:{tenantId:string;enabled:boolean}|null,entitlement:Entitlement,now:Date) {
  authorizeOperationalAccess(tenant,member,entitlement,now);
  if(!tenant.neonProjectId || !tenant.encryptedDatabaseUrl)throw new Error("Banco individual não provisionado.");
  const result=decryptTenantDatabaseUrl(tenant.encryptedDatabaseUrl);
  const url=new URL(result);
  const legacy=process.env.DATABASE_URL;
  if(legacy && new URL(legacy).hostname===url.hostname)
    throw new Error("Não é permitido retornar ao banco legado.");
  return result;
}
