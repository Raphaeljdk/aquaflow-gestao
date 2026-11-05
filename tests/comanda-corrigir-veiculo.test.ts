import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeDemoData } from "../src/lib/demo-data";
import { applyMutation } from "../src/lib/domain";
import type { User, AppData } from "../src/types";

const now = new Date("2026-11-05T19:52:00Z");
const funcionario: User = { id: "atendente", name: "Atendente", email: "atendente@example.com", role: "FUNCIONARIO" };

function comandaAberta(): AppData {
  const data = makeDemoData(now);
  data.comandas = [];
  data.agendamentos = [];
  data.veiculos.find((v) => v.id === "v1")!.tipo = "MOTO";
  return applyMutation(data, {
    entity: "comandas",
    method: "POST",
    data: { clienteId: "c1", veiculoId: "v1", servicoIds: ["s1"], funcionarioId: "f1", desconto: 0 },
  }, funcionario, now);
}

function corrigir(data: AppData, tipo: unknown) {
  return applyMutation(data, {
    entity: "comandas",
    method: "PATCH",
    id: data.comandas[0].id,
    data: { action: "corrigirTipoVeiculo", tipo },
  }, funcionario, now);
}

test("atendente pode corrigir moto para carro numa comanda aguardando sem perder dados", () => {
  const original = comandaAberta();
  const antes = structuredClone(original.comandas[0]);
  const atualizado = corrigir(original, "CARRO");
  assert.equal(atualizado.veiculos.find((v) => v.id === "v1")?.tipo, "CARRO");
  assert.equal(original.veiculos.find((v) => v.id === "v1")?.tipo, "MOTO");
  assert.deepEqual(atualizado.comandas[0], antes);
  assert.equal(atualizado.comandas[0].status, "AGUARDANDO");
});

test("correção funciona em lavagem e valida os três tipos possíveis", () => {
  const aberto = comandaAberta();
  const emLavagem = applyMutation(aberto, {
    entity: "comandas", method: "PATCH", id: aberto.comandas[0].id,
    data: { status: "EM_LAVAGEM", funcionarioId: "f1" },
  }, funcionario, now);
  const corrigido = corrigir(emLavagem, "CAMINHONETE");
  assert.equal(corrigido.veiculos.find((v) => v.id === "v1")?.tipo, "CAMINHONETE");
  assert.equal(corrigir(corrigido, "MOTO").veiculos.find((v) => v.id === "v1")?.tipo, "MOTO");
  assert.throws(() => corrigir(corrigido, "ONIBUS"), /tipo de veículo válido/);
});

test("não permite modificar o veículo por uma comanda já finalizada ou cancelada", () => {
  const aberto = comandaAberta();
  const lavagem = applyMutation(aberto, {
    entity: "comandas", method: "PATCH", id: aberto.comandas[0].id,
    data: { status: "EM_LAVAGEM", funcionarioId: "f1" },
  }, funcionario, now);
  const finalizada = applyMutation(lavagem, {
    entity: "comandas", method: "PATCH", id: lavagem.comandas[0].id,
    data: { status: "FINALIZADO", formaPagamento: "DINHEIRO" },
  }, funcionario, now);
  assert.throws(() => corrigir(finalizada, "CARRO"), /só pode ser corrigido durante o atendimento/);
  const cancelada = applyMutation(aberto, {
    entity: "comandas", method: "PATCH", id: aberto.comandas[0].id,
    data: { status: "CANCELADO" },
  }, funcionario, now);
  assert.throws(() => corrigir(cancelada, "CARRO"), /só pode ser corrigido durante o atendimento/);
});

test("interface oferece corrigir tipo dentro da comanda e salva pela ação autorizada", () => {
  const screen = readFileSync("src/components/forms/order-form.tsx", "utf8");
  assert.match(screen, /Corrigir tipo/);
  assert.match(screen, /action: "corrigirTipoVeiculo", tipo: vehicleType/);
  assert.match(screen, /<option value="CARRO">Carro<\/option>/);
  assert.match(screen, /<option value="MOTO">Moto<\/option>/);
  assert.match(screen, /<option value="CAMINHONETE">Caminhonete<\/option>/);
});
