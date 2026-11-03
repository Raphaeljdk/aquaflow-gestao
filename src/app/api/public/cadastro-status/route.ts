import {NextResponse} from "next/server";
import {saasPilotMode} from "@/lib/saas/identity";
import {ownerInviteChannelReady} from "@/lib/saas/owner-invite-delivery";
export const dynamic="force-dynamic";
/** Public capability status only. Does not expose configuration, tokens, or company data. */
export async function GET() {
  let automatic=false;
  try {
    automatic=saasPilotMode() && (process.env.SAAS_QA_MODE==="true" ||
      process.env.SAAS_PUBLIC_SIGNUP_ENABLED==="true") && ownerInviteChannelReady("EMAIL") &&
      Boolean(process.env.CONTROL_DATABASE_URL && process.env.TENANT_DB_ENCRYPTION_KEY);
  }catch{
    automatic=false;
  }
  return NextResponse.json({automatic},{headers:{"Cache-Control":"private,no-store"}});
}
