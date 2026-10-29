import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { solicitacaoEmpresaSchema } from "@/lib/platform-onboarding";
import { resolvePlatformOffer } from "@/lib/platform-billing";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 12000)
      return NextResponse.json({ error: "Formulário excedeu o limite." }, { status: 413 });
    const body = solicitacaoEmpresaSchema.safeParse(await request.json());
    if (!body.success) return NextResponse.json({ error: "Confira os campos e aceite o aviso de privacidade." }, { status: 400 });
    if (body.data.site) return NextResponse.json({ ok: true }, { status: 202 });
    const salt = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
    if (!salt) return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
    const ip = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const origemHash = createHash("sha256").update(salt + ":" + ip).digest("hex");
    const limite = await prisma.solicitacaoEmpresa.count({
      where: { origemHash, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (limite >= 3) return NextResponse.json({ error: "Limite diário de solicitações atingido. Tente novamente amanhã." }, { status: 429 });
    const { nomeEmpresa, nomeResponsavel, email, cidade, mensagem, cnpj, razaoSocial, planoPagamento, metodoPagamento, modalidadeCadastro } = body.data;
    const trial = modalidadeCadastro === "TESTE_7_DIAS";
    const offer = trial ? null : resolvePlatformOffer(planoPagamento, metodoPagamento);
    await prisma.solicitacaoEmpresa.create({
      data: {
        nomeEmpresa, nomeResponsavel, email, cidade, mensagem, cnpj, razaoSocial,
        modalidadeCadastro,
        // Solicitação gratuita não inicia relógio, não provisiona banco e não cobra cartão.
        testeIniciadoEm: null,
        testeExpiraEm: null,
        formaPagamentoPrevista: offer?.method ?? "NAO_APLICAVEL",
        mensalidadeCentavos: offer?.installments === 12 ? offer.installmentCents : null,
        planoPagamento: offer?.plan ?? null,
        totalContratoCentavos: offer?.totalCents ?? null,
        quantidadeParcelas: offer?.installments ?? null,
        cienciaCondicoesComerciaisEm: trial ? null : new Date(),
        whatsapp: body.data.whatsapp.startsWith("55") ? body.data.whatsapp : "55" + body.data.whatsapp,
        origemHash,
        consentimentoEm: new Date(),
      },
    });
    return NextResponse.json({
      ok: true,
      modalidadeCadastro,
      message: trial
        ? "Pedido de teste de 7 dias registrado. A contagem começa após liberação de ambiente isolado, mediante confirmação da equipe."
        : "Solicitação comercial enviada para análise. Entraremos em contato pelo WhatsApp ou e-mail.",
    }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002")
      return NextResponse.json({ error: "Já existe uma solicitação com este e-mail." }, { status: 409 });
    console.error("[solicitacoes] erro ao registrar solicitação", error);
    return NextResponse.json({ error: "Não foi possível enviar. Tente novamente mais tarde." }, { status: 503 });
  }
}
