import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requirePlatformAdmin();
    return NextResponse.json({ platformAdmin:true }, { headers:{"Cache-Control":"no-store"} });
  } catch {
    return NextResponse.json({ platformAdmin:false }, { headers:{"Cache-Control":"no-store"} });
  }
}
