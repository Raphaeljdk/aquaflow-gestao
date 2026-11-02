import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { snapshot, scopeData } from "@/lib/repository";
import { apiError } from "@/lib/api";
import { withOperationalDatabase } from "@/lib/saas/operations";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await currentUser();
    return NextResponse.json(
      { data: scopeData(await withOperationalDatabase(user,db=>snapshot(db)), user), user },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
