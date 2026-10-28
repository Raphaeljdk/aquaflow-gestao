import { test } from "node:test";
import assert from "node:assert/strict";
import { solicitacaoEmpresaSchema, decisaoSolicitacaoSchema } from "../src/lib/platform-onboarding";
import { PLATFORM_MONTHLY_PRICE_CENTS, PLATFORM_PAYMENT_METHOD, PLATFORM_MONTHLY_PRICE_LABEL } from "../src/lib/platform-billing";

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

test("a assinatura da plataforma é fixa em R$ 80 no débito", () => {
  assert.equal(PLATFORM_MONTHLY_PRICE_CENTS, 8000);
  assert.equal(PLATFORM_MONTHLY_PRICE_LABEL, "R$ 80,00/mês");
  assert.equal(PLATFORM_PAYMENT_METHOD, "CARTAO_DEBITO");
});
test("o cadastro não aceita preço ou meio de pagamento arbitrários como condição comercial", () => {
  const posted = solicitacaoEmpresaSchema.parse({
    ...base, mensalidadeCentavos: 1, formaPagamentoPrevista: "PIX_INTER",
  });
  assert.equal("mensalidadeCentavos" in posted, false);
  assert.equal("formaPagamentoPrevista" in posted, false);
});
