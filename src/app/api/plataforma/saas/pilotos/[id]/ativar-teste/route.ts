import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { checkOrigin } from "@/lib/api";
import { withControlPlane } from "@/lib/saas/control-plane";
import { assertSaasManagementEnabled, activatePilotTrial } from "@/lib/saas/pilot-control";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    assertSaasManagementEnabled();
    checkOrigin(request);
    const { id } = await params;
    const result = await withControlPlane(db => activatePilotTrial(db, id));
    return NextResponse.json(result, { status: result.activated ? 200 : 409,
      headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Ativação não autorizada ou ambiente indisponível." },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
