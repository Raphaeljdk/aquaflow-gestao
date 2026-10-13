import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { apiError } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requirePlatformAdmin();
    const solicitacoes = await prisma.solicitacaoEmpresa.findMany({
      orderBy: { createdAt: "desc" }, take: 150,
      select: {
        id: true, nomeEmpresa: true, nomeResponsavel: true,
        email: true, whatsapp: true, cidade: true, mensagem: true,
        status: true, createdAt: true, revisadoEm: true, revisadoPor: true,
        observacoesInternas: true,
      },
    });
    return NextResponse.json({ solicitacoes }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return apiError(e); }
}
