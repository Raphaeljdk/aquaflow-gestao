import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { checkOrigin, apiError } from "@/lib/api";
import { BusinessError } from "@/lib/domain";
import { novoChamadoSchema } from "@/lib/chamados";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await currentUser();
    const chamados = await prisma.chamadoSuporte.findMany({
      where: user.role === "ADMIN" ? {} : { criadoPorId: user.id },
      orderBy: { updatedAt: "desc" }, take: 100,
      select: {
        id: true, empresaNome: true, titulo: true, categoria: true, prioridade: true,
        status: true, criadoPorNome: true, createdAt: true, updatedAt: true,
        mensagens: {
          select: { id: true, autorTipo: true, autorNome: true, texto: true, createdAt: true },
          orderBy: { createdAt: "asc" }, take: 100,
        },
      },
    });
    return NextResponse.json({ chamados }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return apiError(e); }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    checkOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > 6500)
      throw new BusinessError("Chamado muito grande.", 413);
    const input = novoChamadoSchema.parse(await request.json());
    const recent = await prisma.chamadoSuporte.count({
      where: { criadoPorId: user.id, createdAt: { gte: new Date(Date.now() - 24*60*60*1000) } },
    });
    if (recent >= 10) throw new BusinessError("Limite diário de 10 chamados atingido. Acompanhe os chamados existentes.", 429);
    const empresa = await prisma.configuracao.findUnique({
      where: { id: "empresa" }, select: { nome: true, cnpj: true },
    });
    const chamado = await prisma.chamadoSuporte.create({
      data: {
        empresaNome: empresa?.nome ?? "Lava-rápido",
        empresaCnpj: empresa?.cnpj ?? "",
        criadoPorId: user.id, criadoPorNome: user.name, criadoPorEmail: user.email,
        titulo: input.titulo, categoria: input.categoria, prioridade: input.prioridade,
        mensagens: { create: {
          autorTipo: "SOLICITANTE", autorId: user.id, autorNome: user.name, texto: input.descricao,
        } },
      }, select: { id: true, status: true, createdAt: true },
    });
    return NextResponse.json({ chamado }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch(e) {
    if (e instanceof SyntaxError) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    return apiError(e);
  }
}
