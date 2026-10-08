import test from "node:test";
import assert from "node:assert/strict";
import { allowedPages, canManage, canWrite, canAccessEntity, canAccessPage, loginRedirectPath } from "../src/lib/permissions";
import { roles } from "../src/types";

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

test("API permite cadastrar veículo vinculado ao cliente sem liberar página de veículos", () => {
  for (const role of roles.filter((role) => role !== "ADMIN")) {
    assert.equal(canAccessPage(role, "veiculos"), false);
    for (const method of ["GET", "POST", "PATCH", "DELETE"])
      assert.equal(canAccessEntity(role, "veiculos", method), true, `${role}: ${method}`);
    for (const entity of ["funcionarios", "configuracoes", "servicos", "materiais", "movimentosEstoque"] as const)
      for (const method of ["GET", "POST", "PATCH", "DELETE"])
        assert.equal(canAccessEntity(role, entity, method), false, `${role}: ${entity}`);
  }
});

test("perfis ausentes ou desconhecidos não recebem permissões", () => {
  for (const role of [undefined, null, "", "ROOT", "__proto__"]) {
    assert.equal(canAccessEntity(role, "clientes", "POST"), false);
    assert.equal(canAccessPage(role, "clientes"), false);
  }
});

test("login abre a área permitida e rejeita redirecionamento externo", () => {
  assert.equal(loginRedirectPath("ADMIN", null), "/dashboard");
  assert.equal(loginRedirectPath("FUNCIONARIO", null), "/clientes");
  assert.equal(loginRedirectPath("FUNCIONARIO", "/comandas?q=123"), "/comandas?q=123");
  assert.equal(loginRedirectPath("FUNCIONARIO", "/relatorios"), "/clientes");
  for (const callback of ["https://outro.example", "//outro.example", "/\\outro.example", "/clientes/../relatorios"])
    assert.equal(loginRedirectPath("FUNCIONARIO", callback), "/clientes");
  assert.equal(loginRedirectPath("ADMIN", "/.//outro.example"), "/dashboard");
  assert.equal(loginRedirectPath("ADMIN", "/\n/outro.example/clientes"), "/dashboard");
});
