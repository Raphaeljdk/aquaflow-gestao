import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeDemoData } from "../src/lib/demo-data";
import { applyMutation } from "../src/lib/domain";
import type { User, AppData } from "../src/types";

const now = new Date("2026-11-05T19:52:00Z");
const actor: User = { id: "a", name: "Atendente", email: "atendente@example.com", role: "FUNCIONARIO" };
function order(): AppData {
  const d = makeDemoData(now);
  d.comandas = [];
  d.agendamentos = [];
  return applyMutation(d, { entity: "comandas", method: "POST",
    data: { clienteId: "c1", veiculoId: "v1", servicoIds: ["s1"], funcionarioId: "f1", desconto: 0 } }, actor, now);
}
function status(d: AppData, next: string, extra: Record<string, unknown> = {}) {
  return applyMutation(d, { entity: "comandas", method: "PATCH", id: d.comandas[0].id,
    data: { status: next, ...extra } }, actor, now);
}
test("retirada remove da fila ativa sem apagar histórico, pagamento, itens ou vistoria", () => {
  const d = status(status(order(), "EM_LAVAGEM"), "FINALIZADO", { formaPagamento: "DINHEIRO" });
  const original = structuredClone(d.comandas[0]);
  const delivered = status(d, "ENTREGUE");
  assert.equal(delivered.comandas[0].status, "ENTREGUE");
  assert.deepEqual(delivered.comandas[0].itens, original.itens);
  assert.equal(delivered.comandas[0].total, original.total);
  assert.equal(delivered.comandas[0].formaPagamento, original.formaPagamento);
  assert.equal(delivered.comandas.length, 1);
  assert.equal(d.comandas[0].status, "FINALIZADO");
});
test("não permite retirar veículo antes de finalizar nem retirar duas vezes", () => {
  const d = order();
  assert.throws(() => status(d, "ENTREGUE"), /status/);
  const done = status(status(status(d, "EM_LAVAGEM"), "FINALIZADO", { formaPagamento: "DINHEIRO" }), "ENTREGUE");
  assert.throws(() => status(done, "ENTREGUE"), /status/);
});
test("seleção no quadro só habilita comandas prontas e preserva histórico pesquisável", () => {
  const screen = readFileSync("src/components/orders.tsx", "utf8");
  assert.match(screen, /Selecionar comandas/);
  assert.match(screen, /Selecionar prontos/);
  assert.match(screen, /Confirmar entrega/);
  assert.match(screen, /o\.status === "FINALIZADO"/);
  assert.match(screen, /status: "ENTREGUE"/);
  assert.match(screen, /status === "TODAS"/);
});
