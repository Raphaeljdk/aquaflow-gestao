import { test } from "node:test";
import assert from "node:assert/strict";
import { duracaoAtendimento, previsaoServicos } from "../src/lib/order-timing";
import type { Comanda, Servico } from "../src/types";

const base = {
  status: "AGUARDANDO",
  createdAt: "2026-11-04T20:00:00.000Z",
  finalizadoEm: null,
  itens: [{ servicoId: "lavagem", nome: "Lavagem", quantidade: 2, preco: 50 }],
} as Comanda;

test("cronômetro começa na abertura sem clique adicional", () => {
  const elapsed = duracaoAtendimento(base, Date.parse("2026-11-04T20:13:45.000Z"));
  assert.deepEqual(elapsed, { texto: "00:13:45", segundos: 825 });
});

test("cronômetro para no estado pronto para retirada, inclusive após atualização", () => {
  const pedido = { ...base, status: "FINALIZADO", finalizadoEm: "2026-11-04T20:25:00.000Z" } as Comanda;
  assert.equal(duracaoAtendimento(pedido, Date.parse("2026-11-05T12:00:00Z")).texto, "00:25:00");
});

test("cancelamento não continua a contar tempo", () => {
  assert.equal(duracaoAtendimento({ ...base, status: "CANCELADO" } as Comanda, Date.now()).texto, "—");
});

test("previsão respeita a duração configurada e a quantidade de serviços", () => {
  const servicos = [{ id: "lavagem", duracaoMin: 25 }] as Servico[];
  assert.equal(previsaoServicos(base, servicos), 50);
});
