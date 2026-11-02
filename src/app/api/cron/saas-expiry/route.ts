import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { withControlPlane } from "@/lib/saas/control-plane";
import { runLicenseExpiryScan } from "@/lib/saas/expiry-job";

export const runtime="nodejs";
export const dynamic="force-dynamic";
/** Invoked only by authenticated Vercel cron. No public manual activation. */
function authorized(request:NextRequest) {
  const secret=process.env.CRON_SECRET;
  const token=request.headers.get("authorization")?.replace(/^Bearer /,"") ?? "";
  if(!secret || !token)return false;
  const a=Buffer.from(token), b=Buffer.from(secret);
  return a.length===b.length && timingSafeEqual(a,b);
}
export async function GET(request:NextRequest) {
  if(!authorized(request))return NextResponse.json({error:"Não autorizado."},{status:401});
  try {
    return NextResponse.json(await withControlPlane(db=>runLicenseExpiryScan(db)),
      {headers:{"Cache-Control":"no-store"}});
  }catch{
    console.error("[saas-expiry] Verifique a configuração da base central.");
    return NextResponse.json({error:"Rotina indisponível."},{status:503});
  }
}
