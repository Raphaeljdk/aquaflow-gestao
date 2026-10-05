import test from "node:test";
import assert from "node:assert/strict";
import { allowedPages, canManage, canWrite } from "../src/lib/permissions";

test("administrador mantém acesso total de gestão", () => {
  assert.equal(canManage("ADMIN"), true);
  for (const page of [
    "dashboard",
    "clientes",
    "comandas",
    "agendamentos",
    "funcionarios",
    "relatorios",
    "configuracoes",
    "estoque",
  ]) {
    assert.equal(allowedPages.ADMIN.includes(page), true, page);
  }
});

test("funcionário enxerga somente clientes, comandas e agendamentos", () => {
  assert.deepEqual(allowedPages.FUNCIONARIO, [
    "clientes",
    "comandas",
    "agendamentos",
  ]);
  assert.equal(canManage("FUNCIONARIO"), false);
  assert.equal(allowedPages.FUNCIONARIO.includes("veiculos"), false);
  assert.equal(allowedPages.FUNCIONARIO.includes("funcionarios"), false);
  assert.equal(allowedPages.FUNCIONARIO.includes("relatorios"), false);
  assert.equal(allowedPages.FUNCIONARIO.includes("configuracoes"), false);
});

test("funcionário pode manter veículo somente pelo fluxo do cliente", () => {
  assert.equal(canWrite("FUNCIONARIO", "clientes"), true);
  assert.equal(canWrite("FUNCIONARIO", "veiculos"), true);
  assert.equal(canWrite("FUNCIONARIO", "comandas"), true);
  assert.equal(canWrite("FUNCIONARIO", "agendamentos"), true);
  assert.equal(canWrite("FUNCIONARIO", "funcionarios"), false);
  assert.equal(canWrite("FUNCIONARIO", "configuracoes"), false);
  assert.equal(canWrite("FUNCIONARIO", "materiais"), false);
});
