import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { apareceNaFilaOperacional, estadosFilaOperacional } from "../src/lib/order-visibility";
import { makeDemoData } from "../src/lib/demo-data";
import { applyMutation } from "../src/lib/domain";
import type { User } from "../src/types";

const actor: User = { id: "u1", name: "Operador", email: "operador@example.com", role: "FUNCIONARIO" };
const now = new Date("2026-11-06T13:00:00Z");
function iniciarComanda() {
  const d = makeDemoData(now);
  d.comandas = [];
  d.agendamentos = [];
  return applyMutation(d, { entity: "comandas", method: "POST", data: {
    clienteId: "c1", veiculoId: "v1", servicoIds: ["s1"], funcionarioId: "f1", desconto: 0
  } }, actor, now);
}
function mudarStatus(data: ReturnType<typeof iniciarComanda>, status: "EM_LAVAGEM" | "FINALIZADO" | "ENTREGUE") {
  return applyMutation(data, { entity: "comandas", id: data.comandas[0].id,
    method: "PATCH", data: { status, ...(status === "FINALIZADO" ? { formaPagamento: "DINHEIRO" } : {}) } }, actor, now);
}

test("fila operacional mantém aguardando, em lavagem e finalizadas", () => {
  assert.deepEqual(estadosFilaOperacional, ["AGUARDANDO", "EM_LAVAGEM", "FINALIZADO"]);
  assert.equal(apareceNaFilaOperacional("AGUARDANDO"), true);
  assert.equal(apareceNaFilaOperacional("EM_LAVAGEM"), true);
  assert.equal(apareceNaFilaOperacional("FINALIZADO"), true);
  for (const status of ["ENTREGUE", "CANCELADO"] as const)
    assert.equal(apareceNaFilaOperacional(status), false);
});

test("ao finalizar comanda ela permanece no quadro; só retirada manual altera para entregue", () => {
  const aguardando = iniciarComanda();
  assert.equal(apareceNaFilaOperacional(aguardando.comandas[0].status), true);
  const lavando = mudarStatus(aguardando, "EM_LAVAGEM");
  assert.equal(apareceNaFilaOperacional(lavando.comandas[0].status), true);
  const finalizada = mudarStatus(lavando, "FINALIZADO");
  assert.equal(apareceNaFilaOperacional(finalizada.comandas[0].status), true);
  assert.equal(finalizada.comandas.length, 1);
  assert.equal(finalizada.comandas[0].formaPagamento, "DINHEIRO");
  assert.equal(finalizada.comandas[0].total, aguardando.comandas[0].total);
  assert.deepEqual(finalizada.comandas[0].itens, aguardando.comandas[0].itens);
  assert.equal(finalizada.comandas[0].status, "FINALIZADO");
  const entregue = mudarStatus(finalizada, "ENTREGUE");
  assert.equal(apareceNaFilaOperacional(entregue.comandas[0].status), false);
  assert.equal(entregue.comandas.length, 1);
});

test("interface conserva histórico e exige menu de três pontinhos para excluir da fila", () => {
  const source = readFileSync("src/components/orders.tsx", "utf8");
  assert.match(source, /status === "ATIVAS" && apareceNaFilaOperacional\(o\.status\)/);
  assert.match(source, /status === "TODAS"/);
  assert.match(source, /<MoreHorizontal size=\{18\}/);
  assert.match(source, /Ver histórico/);
  assert.match(source, /Excluir/);
  assert.match(source, /await mutate\(\{ entity: "comandas", method: "PATCH", id: o.id,/);
  assert.doesNotMatch(source, /setStatus\("FINALIZADO"\); setView\("table"\)/);
  assert.match(source, /\[status as Status\]/);
});
