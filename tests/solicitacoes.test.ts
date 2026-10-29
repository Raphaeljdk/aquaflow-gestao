import { test } from "node:test";
import { readFileSync } from "node:fs";
import { calculateTrialWindow, getTrialState, TRIAL_MILLISECONDS } from "../src/lib/platform-trial";
import assert from "node:assert/strict";
import { solicitacaoEmpresaSchema, decisaoSolicitacaoSchema } from "../src/lib/platform-onboarding";
import { PLATFORM_MONTHLY_PRICE_CENTS, PLATFORM_ANNUAL_STANDARD_CENTS, PLATFORM_ANNUAL_UPFRONT_CENTS, PLATFORM_ANNUAL_SAVINGS_CENTS, resolvePlatformOffer } from "../src/lib/platform-billing";

const base = { nomeEmpresa: "Lava Rápido Central", nomeResponsavel: "Marcos da Silva", email: "TESTE@EXAMPLE.COM", whatsapp: "(11) 99200-3650", cidade: "Itapevi, SP", aceitePrivacidade: true, cienteCondicoesComerciais: true, site: "" };
test("solicitação normaliza contato", () => {
  const x = solicitacaoEmpresaSchema.parse(base);
  assert.equal(x.email, "teste@example.com");
  assert.equal(x.whatsapp, "11992003650");
});
test("solicitação não prossegue sem consentimento", () => {
  assert.equal(solicitacaoEmpresaSchema.safeParse({ ...base, aceitePrivacidade:false }).success, false);
});
test("solicitação exige ciência dos custos, sem aceitar valores fictícios", () => {
  assert.equal(solicitacaoEmpresaSchema.safeParse({ ...base, cienteCondicoesComerciais: false }).success, false);
  assert.equal(solicitacaoEmpresaSchema.safeParse({ ...base, cienteCondicoesComerciais: true }).success, true);
});
test("rejeita telefone inválido", () => {
  assert.equal(solicitacaoEmpresaSchema.safeParse({ ...base, whatsapp:"1234" }).success, false);
});
test("somente status de revisão permitidos", () => {
  assert.equal(decisaoSolicitacaoSchema.safeParse({status:"APROVADO"}).success,true);
  assert.equal(decisaoSolicitacaoSchema.safeParse({status:"SUPERADMIN"}).success,false);
});

test("dois planos anuais com total coerente e R$ 170 de economia", () => {
  assert.equal(PLATFORM_MONTHLY_PRICE_CENTS * 12, PLATFORM_ANNUAL_STANDARD_CENTS);
  assert.equal(PLATFORM_ANNUAL_STANDARD_CENTS, 96000);
  assert.equal(PLATFORM_ANNUAL_UPFRONT_CENTS, 79000);
  assert.equal(PLATFORM_ANNUAL_SAVINGS_CENTS, 17000);
});
test("mensalidades: apenas débito, 12 vezes R$ 80", () => {
  const offer = resolvePlatformOffer("ANUAL_MENSAL", "CARTAO_DEBITO");
  assert.equal(offer.totalCents, 96000);
  assert.equal(offer.installments, 12);
  assert.equal(offer.installmentCents, 8000);
});
test("à vista: Pix ou crédito 1x, nunca parcelado", () => {
  for (const payment of ["PIX_INTER", "CARTAO_CREDITO_1X"] as const) {
    const offer = resolvePlatformOffer("ANUAL_AVISTA", payment);
    assert.equal(offer.totalCents, 79000);
    assert.equal(offer.installments, 1);
    assert.equal(offer.installmentCents, 79000);
    assert.equal(solicitacaoEmpresaSchema.safeParse({ ...base, planoPagamento: "ANUAL_AVISTA", metodoPagamento: payment }).success, true);
  }
});
test("não permite Pix no plano mensal, débito à vista nem crédito parcelado", () => {
  const invalidos = [
    { planoPagamento: "ANUAL_MENSAL", metodoPagamento: "PIX_INTER" },
    { planoPagamento: "ANUAL_MENSAL", metodoPagamento: "CARTAO_CREDITO_1X" },
    { planoPagamento: "ANUAL_AVISTA", metodoPagamento: "CARTAO_DEBITO" },
    { planoPagamento: "ANUAL_AVISTA", metodoPagamento: "CARTAO_CREDITO_12X" },
  ];
  for (const invalid of invalidos) assert.equal(solicitacaoEmpresaSchema.safeParse({ ...base, ...invalid }).success, false);
  assert.throws(() => resolvePlatformOffer("ANUAL_MENSAL", "PIX_INTER"));
});
test("preços enviados pelo cliente são ignorados (servidor calcula valor)", () => {
  const parsed = solicitacaoEmpresaSchema.parse({
    ...base, planoPagamento: "ANUAL_AVISTA", metodoPagamento: "PIX_INTER",
    totalContratoCentavos: 1, mensalidadeCentavos: 1, quantidadeParcelas: 99,
  });
  assert.equal("totalContratoCentavos" in parsed, false);
  assert.equal("mensalidadeCentavos" in parsed, false);
  assert.equal("quantidadeParcelas" in parsed, false);
  assert.equal(resolvePlatformOffer(parsed.planoPagamento, parsed.metodoPagamento).totalCents, 79000);
});

test("teste de 7 dias pode ser solicitado sem aceitar cobrança de plano anual", () => {
  const request = solicitacaoEmpresaSchema.parse({
    ...base,
    modalidadeCadastro: "TESTE_7_DIAS",
    cienteCondicoesComerciais: false,
    planoPagamento: "ANUAL_AVISTA",
    metodoPagamento: "CARTAO_DEBITO",
  });
  assert.equal(request.modalidadeCadastro, "TESTE_7_DIAS");
  assert.equal(request.cienteCondicoesComerciais, false);
  assert.equal(solicitacaoEmpresaSchema.safeParse({
    ...base,
    modalidadeCadastro: "CONTRATACAO",
    cienteCondicoesComerciais: false,
  }).success, false);
});
test("7 dias começam exclusivamente na ativação e vencem depois de 168 horas", () => {
  const activated = new Date("2026-11-02T12:00:00Z");
  const window = calculateTrialWindow(activated);
  assert.equal(window.expiresAt.getTime()-window.startedAt.getTime(), TRIAL_MILLISECONDS);
  const registered = { modalidadeCadastro: "TESTE_7_DIAS", status: "PENDENTE", testeIniciadoEm: null, testeExpiraEm: null };
  assert.equal(getTrialState(registered), "SOLICITADO");
  assert.equal(getTrialState({...registered,status:"APROVADO"}), "AGUARDANDO_ATIVACAO");
  assert.equal(getTrialState({...registered,status:"APROVADO",testeIniciadoEm:window.startedAt,testeExpiraEm:window.expiresAt},new Date("2026-11-09T11:59:59Z")), "ATIVO");
  assert.equal(getTrialState({...registered,status:"APROVADO",testeIniciadoEm:window.startedAt,testeExpiraEm:window.expiresAt},new Date("2026-11-09T12:00:00Z")), "EXPIRADO");
  assert.equal(getTrialState({...registered,modalidadeCadastro:"CONTRATACAO"}), "NAO_APLICAVEL");
});
test("requisição gratuita não cobra nem provisiona usuário no banco legado", () => {
  const src = readFileSync("src/app/api/solicitacoes/route.ts", "utf8");
  assert.match(src, /trial \? null : resolvePlatformOffer/);
  assert.match(src, /testeIniciadoEm: null/);
  assert.match(src, /testeExpiraEm: null/);
  assert.match(src, /modalidadeCadastro,/);
  assert.doesNotMatch(src, /prisma\.user\.create|prisma\.user\.upsert/);
});
test("login mostra CTA explícito e registro permite selecionar teste ou contratação", () => {
  const login = readFileSync("src/components/login.tsx", "utf8");
  const form = readFileSync("src/app/cadastrar-lava-rapido/page.tsx", "utf8");
  const admin = readFileSync("src/components/platform-dashboard.tsx", "utf8");
  assert.match(login, /Solicitar teste grátis de 7 dias/);
  assert.match(login, /modalidade=teste/);
  assert.match(form, /Teste grátis de 7 dias/);
  assert.match(form, /modalidadeCadastro/);
  assert.match(form, /!trial && <section/);
  assert.match(admin, /Testes de 7 dias/);
  assert.match(admin, /Aprovar análise/);
  assert.match(admin, /Aprovação administrativa não cria banco/);
});
