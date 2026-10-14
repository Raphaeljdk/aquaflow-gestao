import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { decisaoSolicitacaoSchema } from "@/lib/platform-onboarding";
import { apiError, checkOrigin } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePlatformAdmin();
    checkOrigin(req);
    const { id } = await params;
    const values = decisaoSolicitacaoSchema.safeParse(await req.json());
    if (!values.success) return NextResponse.json({ error: "Dados de revisão inválidos." }, { status: 400 });
    const existing = await prisma.solicitacaoEmpresa.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
    const atualizado = await prisma.solicitacaoEmpresa.update({
      where: { id }, data: {
        status: values.data.status,
        observacoesInternas: values.data.observacoesInternas,
        revisadoEm: new Date(), revisadoPor: user.email,
      },
      select: { id: true, status: true, revisadoEm: true },
    });
    // Aprovação não cria automaticamente usuário ou acesso a dados de outro tenant.
    return NextResponse.json({ solicitacao: atualizado });
  } catch (e) { return apiError(e); }
}
