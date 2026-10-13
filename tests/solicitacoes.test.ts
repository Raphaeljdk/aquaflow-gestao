import { test } from "node:test";
import assert from "node:assert/strict";
import { solicitacaoEmpresaSchema, decisaoSolicitacaoSchema } from "../src/lib/platform-onboarding";

const base = { nomeEmpresa: "Lava Rápido Central", nomeResponsavel: "Marcos da Silva", email: "TESTE@EXAMPLE.COM", whatsapp: "(11) 99200-3650", cidade: "Itapevi, SP", aceitePrivacidade: true, site: "" };
test("solicitação normaliza contato", () => {
  const x = solicitacaoEmpresaSchema.parse(base);
  assert.equal(x.email, "teste@example.com");
  assert.equal(x.whatsapp, "11992003650");
});
test("solicitação não prossegue sem consentimento", () => {
  assert.equal(solicitacaoEmpresaSchema.safeParse({ ...base, aceitePrivacidade:false }).success, false);
});
test("rejeita telefone inválido", () => {
  assert.equal(solicitacaoEmpresaSchema.safeParse({ ...base, whatsapp:"1234" }).success, false);
});
test("somente status de revisão permitidos", () => {
  assert.equal(decisaoSolicitacaoSchema.safeParse({status:"APROVADO"}).success,true);
  assert.equal(decisaoSolicitacaoSchema.safeParse({status:"SUPERADMIN"}).success,false);
});
