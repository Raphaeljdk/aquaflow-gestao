import { currentUser } from "@/lib/auth";
import { BusinessError } from "@/lib/domain";

export async function requirePlatformAdmin() {
  const user = await currentUser();
  const allowedEmail = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowedEmail || user.role !== "ADMIN" || user.email?.toLowerCase() !== allowedEmail)
    throw new BusinessError("Acesso restrito ao administrador da plataforma.", 403);
  return user;
}
