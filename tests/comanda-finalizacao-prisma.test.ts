import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dadosComandaParaPrisma } from "../src/lib/comanda-persistence";
import type { Comanda } from "../src/types";

const comandaBase = {
  id: "cmd1",
  numero: 1004,
  clienteId: "cli1",
  veiculoId: "vei1",
  status: "EM_LAVAGEM",
  total: 105,
  desconto: 5,
  formaPagamento: null,
  observacoes: "",
  vistoria: null,
  funcionarioId: "fun1",
  comissao: 0,
  comissaoPercentual: 0,
  createdAt: "2026-11-08T20:00:00.000Z",
  finalizadoEm: null,
  pagoEm: null,
  itens: [{ servicoId: "s1", nome: "Lavagem", preco: 110, quantidade: 1 }],
} as Comanda;

/**
 * O snapshot inclui envioWhatsApp pela leitura do Prisma; não é atributo
 * escalar e causava PrismaClientValidationError no PATCH de finalização.
 */
test("o payload de persistência da comanda exclui relacionamentos e metadados do snapshot", () => {
  const snapshot = {
    ...comandaBase,
    envioWhatsApp: { id: "wh1", comandaId: "cmd1", status: "PENDING" },
    whatsappEnvioStatus: "PENDING",
    whatsappEnvioEm: "2026-11-08T20:01:00.000Z",
    whatsappAutorizadoEm: "2026-11-08T19:58:00.000Z",
    whatsappAutorizacaoPor: "u1",
    updatedAt: new Date("2026-11-08T19:59:00.000Z"),
    relacaoFutura: { id: "nao-serializar" },
  } as Comanda & { envioWhatsApp: unknown };
  const data = dadosComandaParaPrisma(snapshot);
  for (const campo of [
    "id", "itens", "envioWhatsApp", "whatsappEnvioStatus",
    "whatsappEnvioEm", "whatsappAutorizadoEm", "whatsappAutorizacaoPor",
    "updatedAt", "relacaoFutura",
  ]) assert.equal(Object.prototype.hasOwnProperty.call(data, campo), false, campo);
  assert.equal(data.status, "EM_LAVAGEM");
  assert.equal(data.total, 105);
  assert.equal(data.clienteId, "cli1");
  assert.equal(data.formaPagamento, null);
  assert.equal(data.createdAt.toISOString(), comandaBase.createdAt);
});

test("finalização preserva pagamento, comissão, horário e vistoria sem anexar relação WhatsApp", () => {
  const encerrada = {
    ...comandaBase,
    status: "FINALIZADO",
    formaPagamento: "DINHEIRO",
    comissaoPercentual: 30,
    comissao: 31.5,
    finalizadoEm: "2026-11-08T20:55:00.000Z",
    pagoEm: "2026-11-08T20:55:00.000Z",
    vistoria: { itens: [], observacoesGerais: "", atualizadoEm: "2026-11-08T20:00:00.000Z" },
    envioWhatsApp: null,
  } as Comanda & { envioWhatsApp: unknown };
  const result = dadosComandaParaPrisma(encerrada);
  assert.equal(result.status, "FINALIZADO");
  assert.equal(result.formaPagamento, "DINHEIRO");
  assert.equal(result.comissaoPercentual, 30);
  assert.equal(result.comissao, 31.5);
  assert.equal(result.finalizadoEm?.toISOString(), encerrada.finalizadoEm);
  assert.equal(result.pagoEm?.toISOString(), encerrada.pagoEm);
  assert.deepEqual(result.vistoria, encerrada.vistoria);
  assert.equal(Object.prototype.hasOwnProperty.call(result, "envioWhatsApp"), false);
});

test("repositório usa whitelist de campos tanto no update quanto no create", () => {
  const source = readFileSync("src/lib/repository.ts", "utf8");
  assert.match(source, /const data = dadosComandaParaPrisma\(o\)/);
  assert.match(source, /tx\.comanda\.update\(\{ where: \{ id: o\.id \}, data \}\)/);
  assert.match(source, /tx\.comanda\.create\(\{/);
  assert.doesNotMatch(source, /const \{ id, itens, vistoria, whatsappAutorizadoEm:/);
});
