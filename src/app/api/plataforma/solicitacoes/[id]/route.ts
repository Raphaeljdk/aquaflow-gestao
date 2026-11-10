import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { decisaoSolicitacaoSchema } from "@/lib/platform-onboarding";
import { apiError, checkOrigin } from "@/lib/api";
import { BusinessError } from "@/lib/domain";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePlatformAdmin();
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

/** Exclusão individual somente de solicitação antiga de teste, nunca de licença ativa. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    checkOrigin(req);
    const { id } = await params;
    const input = z.object({
      confirmacao: z.literal("EXCLUIR CADASTRO"),
      email: z.string().email().max(254),
    }).strict().parse(await req.json());
    const existing = await prisma.solicitacaoEmpresa.findUnique({ where: { id } });
    if (!existing) throw new BusinessError("Solicitação não encontrada.", 404);
    if (existing.email.toLowerCase() !== input.email.toLowerCase())
      throw new BusinessError("E-mail não confere. Cadastro preservado.", 409);
    if (existing.modalidadeCadastro !== "TESTE_7_DIAS" ||
      !["PENDENTE", "REJEITADO"].includes(existing.status) ||
      existing.testeIniciadoEm || existing.testeExpiraEm)
      throw new BusinessError("Este cadastro foi aprovado ou tem histórico de contratação/teste. Exclusão bloqueada.", 409);
    const removed = await prisma.solicitacaoEmpresa.deleteMany({
      where: {
        id,
        email: existing.email,
        modalidadeCadastro: "TESTE_7_DIAS",
        status: { in: ["PENDENTE", "REJEITADO"] },
        testeIniciadoEm: null,
        testeExpiraEm: null,
      },
    });
    if (removed.count !== 1) throw new BusinessError("Cadastro mudou. Atualize e tente novamente.", 409);
    return NextResponse.json({deleted:true},{headers:{"Cache-Control":"private, no-store"}});
  } catch(e) { return apiError(e); }
}
