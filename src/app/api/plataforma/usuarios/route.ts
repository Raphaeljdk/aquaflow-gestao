import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { apiError } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requirePlatformAdmin();
    const usuarios = await prisma.user.findMany({
      select: { id:true, name:true, email:true, role:true, ativo:true, createdAt:true },
      orderBy: { createdAt:"desc" }, take: 100,
    });
    return NextResponse.json({ usuarios }, { headers: { "Cache-Control":"no-store" } });
  } catch (e) { return apiError(e); }
}
