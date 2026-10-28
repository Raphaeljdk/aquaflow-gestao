import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { apiError } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requirePlatformAdmin();
    const chamados = await prisma.chamadoSuporte.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 250,
      select: {
        id: true, titulo: true, empresaNome: true, empresaCnpj: true,
        criadoPorNome: true, criadoPorEmail: true,
        categoria: true, prioridade: true, status: true,
        createdAt: true, updatedAt: true,
        mensagens: {
          select: { id: true, autorTipo: true, autorNome: true, texto: true, createdAt: true },
          orderBy: { createdAt: "asc" }, take: 100,
        },
      },
    });
    return NextResponse.json({ chamados }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return apiError(e); }
}
