import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { solicitacaoEmpresaSchema } from "@/lib/platform-onboarding";
import { resolvePlatformOffer } from "@/lib/platform-billing";
import { saasPilotMode } from "@/lib/saas/identity";
import { withControlPlane } from "@/lib/saas/control-plane";
import { registerTrialRequest } from "@/lib/saas/signup";
import { ownerInviteChannelReady } from "@/lib/saas/owner-invite-delivery";
import { BusinessError } from "@/lib/domain";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 12000)
      return NextResponse.json({ error: "Formulário excedeu o limite." }, { status: 413 });
    const body = solicitacaoEmpresaSchema.safeParse(await request.json());
    if (!body.success) return NextResponse.json({ error: "Confira os campos e aceite o aviso de privacidade." }, { status: 400 });
    if (body.data.site) return NextResponse.json({ ok: true }, { status: 202 });
    if (saasPilotMode()) {
      if(!ownerInviteChannelReady("EMAIL"))
        return NextResponse.json({error:"Convites por e-mail indisponíveis temporariamente."},{status:503});
      if(process.env.SAAS_QA_MODE==="true" && body.data.modalidadeCadastro!=="TESTE_7_DIAS")
        return NextResponse.json({error:"Apenas piloto gratuito permitido neste ambiente."},{status:400});
      const contact=body.data.whatsapp.startsWith("55") ? body.data.whatsapp : "55"+body.data.whatsapp;
      const salt=process.env.NEXTAUTH_SECRET??process.env.AUTH_SECRET;
      if(!salt)return NextResponse.json({error:"Serviço de cadastro temporariamente indisponível."},{status:503});
      const ip=request.headers.get("x-vercel-forwarded-for")??request.headers.get("x-forwarded-for")?.split(",")[0]??"unknown";
      const originHash=createHash("sha256").update(salt+":"+ip).digest("hex");
      const result=await withControlPlane(db=>registerTrialRequest(db,{nomeEmpresa:body.data.nomeEmpresa,
        nomeResponsavel:body.data.nomeResponsavel,email:body.data.email,whatsapp:contact,
        kind:body.data.modalidadeCadastro,plan:body.data.planoPagamento,
        method:body.data.metodoPagamento,originHash}));
      return NextResponse.json({ok:true,modalidadeCadastro:body.data.modalidadeCadastro,protocolo:result.id,
        message:body.data.modalidadeCadastro==="TESTE_7_DIAS"?
         "Cadastro recebido! Enviaremos um e-mail para criar sua senha. Após a confirmação, seu banco exclusivo será preparado automaticamente e o teste começará quando estiver pronto.":
         "Cadastro recebido! Enviaremos um e-mail para criar sua senha. O banco será preparado após a confirmação; o acesso pago dependerá da confirmação do pagamento."},{status:201});
    }
    const salt = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
    if (!salt) return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
    const ip = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const origemHash = createHash("sha256").update(salt + ":" + ip).digest("hex");
    const registered = await prisma.solicitacaoEmpresa.findUnique({
      where:{email:body.data.email},select:{id:true}
    });
    if(registered)return NextResponse.json({
      error:"Este e-mail já possui cadastro registrado. Não é necessário preencher novamente. Entre em contato com o suporte para recuperar o acesso."
    },{status:409});
    const limite = await prisma.solicitacaoEmpresa.count({
      where: { origemHash, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (limite >= 10) return NextResponse.json({ error: "Muitas solicitações desta rede nas últimas 24 horas. Aguarde ou procure o suporte." }, { status: 429, headers: { "Retry-After": "3600" } });
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
    if(error instanceof BusinessError)return NextResponse.json({error:error.message},{status:error.status});
    if (error && typeof error === "object" && "code" in error && error.code === "P2002")
      return NextResponse.json({ error: "Já existe uma solicitação com este e-mail." }, { status: 409 });
    console.error("[solicitacoes] erro ao registrar solicitação", error);
    return NextResponse.json({ error: "Não foi possível enviar. Tente novamente mais tarde." }, { status: 503 });
  }
}
