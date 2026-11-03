import "server-only";
import {createHmac} from "node:crypto";
/** Opaque session version. Changes whenever the stored bcrypt hash changes. */
export function passwordVersion(storedHash:string):string{
 const secret=process.env.NEXTAUTH_SECRET??process.env.AUTH_SECRET;
 if(!secret)throw new Error("Autenticação não configurada.");
 return createHmac("sha256",secret).update("ducha-password-version-v1:"+storedHash).digest("hex");
}
