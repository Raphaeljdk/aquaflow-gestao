import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { apiError, checkOrigin } from "@/lib/api";
import { parceiroSchema } from "@/lib/parceiros";
import { BusinessError } from "@/lib/domain";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const parceiros = await prisma.parceiroLavaRapido.findMany({
      orderBy: { createdAt: "desc" }, take: 250,
      select: { id: true, nome: true, cidade: true, whatsapp: true, ativo: true, createdAt: true,
        cnpj: true, razaoSocial: true, responsavel: true, endereco: true, cep: true, bairro: true,
        uf: true, email: true, telefoneComercial: true, situacaoCadastral: true,
        atividadePrincipal: true, naturezaJuridica: true, porte: true, dataAbertura: true },
    });
    return NextResponse.json({ parceiros }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin();
    checkOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > 5000)
      throw new BusinessError("Cadastro muito grande.", 413);
    const data = parceiroSchema.parse(await request.json());
    const parceiro = await prisma.parceiroLavaRapido.create({
      data: { ...data, ativo: false }, // nunca publica automaticamente
      select: { id: true, nome: true, cidade: true, whatsapp: true, ativo: true, createdAt: true,
        cnpj: true, razaoSocial: true, responsavel: true, endereco: true, cep: true, bairro: true,
        uf: true, email: true, telefoneComercial: true, situacaoCadastral: true,
        atividadePrincipal: true, naturezaJuridica: true, porte: true, dataAbertura: true },
    });
    return NextResponse.json({ parceiro }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    return apiError(error);
  }
}
