import { currentUser } from "@/lib/auth";
import { BusinessError } from "@/lib/domain";
import { saasPilotMode } from "@/lib/saas/identity";

export async function requirePlatformAdmin() {
  const user = await currentUser();
  const allowedEmail = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowedEmail || user.role !== "ADMIN" || user.email?.toLowerCase() !== allowedEmail || user.tenantId || (saasPilotMode() && !user.platformOperator))
    throw new BusinessError("Acesso restrito ao administrador da plataforma.", 403);
  return user;
}
