import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { checkOrigin, apiError } from "@/lib/api";
import { BusinessError } from "@/lib/domain";
import { criteriosSolicitacoesTesteDescartaveis } from "@/lib/platform-test-cleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({
  confirmacao: z.literal("LIMPAR TESTES"),
  quantidade: z.number().int().min(1).max(100000),
}).strict();

export async function GET() {
  try {
    await requirePlatformAdmin();
    const [elegiveis, total] = await Promise.all([
      prisma.solicitacaoEmpresa.count({ where: criteriosSolicitacoesTesteDescartaveis }),
      prisma.solicitacaoEmpresa.count(),
    ]);
    return NextResponse.json({ elegiveis, protegidos: total - elegiveis }, {
      headers: { "Cache-Control": "private, no-store" }
    });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin();
    checkOrigin(request);
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 2000) throw new BusinessError("Requisição inválida.", 413);
    const values = schema.parse(await request.json());
    const removidos = await prisma.$transaction(async tx => {
      const quantidadeAtual = await tx.solicitacaoEmpresa.count({
        where: criteriosSolicitacoesTesteDescartaveis
      });
      if (quantidadeAtual !== values.quantidade)
        throw new BusinessError("A lista de cadastros mudou. Atualize a prévia antes de confirmar.", 409);
      const resultado = await tx.solicitacaoEmpresa.deleteMany({
        where: criteriosSolicitacoesTesteDescartaveis
      });
      if (resultado.count !== values.quantidade)
        throw new BusinessError("A lista mudou durante a exclusão. Nenhum cadastro foi apagado.", 409);
      return resultado.count;
    });
    return NextResponse.json({ removidos }, {
      headers: { "Cache-Control": "private, no-store" }
    });
  } catch (error) { return apiError(error); }
}
