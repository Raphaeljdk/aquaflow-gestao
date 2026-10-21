import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const parceiros = await prisma.parceiroLavaRapido.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, cidade: true },
      orderBy: [{ nome: "asc" }, { cidade: "asc" }],
      take: 200,
    });
    return NextResponse.json({ parceiros }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[parceiros] indisponível", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Não foi possível consultar os parceiros." }, { status: 503 });
  }
}
