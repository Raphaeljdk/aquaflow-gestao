import test from "node:test";
import assert from "node:assert/strict";
import { allowedPages, canManage, canRead, canWrite, pagesForUser } from "../src/lib/permissions";

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

test("funcionário não altera cadastro, equipe ou configurações", () => {
  assert.equal(canWrite("FUNCIONARIO", "clientes"), false);
  assert.equal(canWrite("FUNCIONARIO", "veiculos"), false);
  assert.equal(canWrite("FUNCIONARIO", "comandas"), true);
  assert.equal(canWrite("FUNCIONARIO", "agendamentos"), true);
  assert.equal(canWrite("FUNCIONARIO", "funcionarios"), false);
  assert.equal(canWrite("FUNCIONARIO", "configuracoes"), false);
  assert.equal(canWrite("FUNCIONARIO", "materiais"), false);
});

test("todos os perfis operacionais conseguem abrir e acompanhar comandas", () => {
  for (const role of ["ADMIN", "FUNCIONARIO", "GERENTE", "ATENDENTE", "LAVADOR"] as const) {
    assert.equal(allowedPages[role].includes("comandas"), true, role);
    assert.equal(canWrite(role, "comandas"), true, role);
    assert.equal(allowedPages[role].includes("agendamentos"), true, role);
    assert.equal(canWrite(role, "agendamentos"), true, role);
  }
});

test("proprietário limita a permissão por funcionário no servidor", () => {
  const atendente = { role: "ATENDENTE" as const, permissoes: ["agendamentos"] };
  assert.deepEqual(pagesForUser(atendente), ["agendamentos"]);
  assert.equal(canWrite(atendente, "agendamentos"), true);
  assert.equal(canWrite(atendente, "comandas"), false);
  assert.equal(canRead(atendente, "clientes"), false);
  assert.equal(canRead(atendente, "servicos"), true); // seleção na agenda
  assert.equal(canRead(atendente, "funcionarios"), false);
  const lavador = { role: "LAVADOR" as const, permissoes: ["comandas"] };
  assert.equal(canWrite(lavador, "comandas"), true);
  assert.equal(canWrite(lavador, "agendamentos"), false);
  assert.equal(canRead(lavador, "configuracoes"), false);
  const estoquista = { role: "FUNCIONARIO" as const, permissoes: ["estoque"] };
  assert.equal(canRead(estoquista, "materiais"), true);
  assert.equal(canWrite(estoquista, "materiais"), false);
  assert.equal(canWrite(estoquista, "movimentosEstoque"), false);
  assert.deepEqual(pagesForUser({ role: "FUNCIONARIO", permissoes: ["invalida","estoque"] }), ["estoque"]);
  assert.deepEqual(pagesForUser({role:"FUNCIONARIO",permissoes: []}), ["clientes", "comandas", "agendamentos"]);
});
