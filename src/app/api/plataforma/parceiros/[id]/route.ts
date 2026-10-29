import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { apiError, checkOrigin } from "@/lib/api";
import { parceiroUpdateSchema } from "@/lib/parceiros";
import { BusinessError } from "@/lib/domain";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    checkOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > 5000)
      throw new BusinessError("Atualização muito grande.", 413);
    const { id } = await params;
    const data = parceiroUpdateSchema.parse(await request.json());
    const existing = await prisma.parceiroLavaRapido.findUnique({ where: { id } });
    if (!existing) throw new BusinessError("Parceiro não encontrado.", 404);
    const parceiro = await prisma.parceiroLavaRapido.update({
      where: { id }, data, select: { id: true, nome: true, responsavel: true, cidade: true, endereco: true, cnpj: true, email: true, whatsapp: true, ativo: true, createdAt: true },
    });
    return NextResponse.json({ parceiro });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    return apiError(error);
  }
}
