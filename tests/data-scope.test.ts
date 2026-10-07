import test from "node:test";
import assert from "node:assert/strict";
import { scopeData } from "../src/lib/data-scope";
import { makeDemoData } from "../src/lib/demo-data";
import { roles, type User } from "../src/types";

test("snapshot do funcionário mantém operação e omite acessos, estoque e comissões", () => {
  const data = makeDemoData();
  data.funcionarios[0].acesso = { ativo: true, email: "equipe@example.com", role: "FUNCIONARIO" };
  data.funcionarios[0].comissao = 20;
  for (const role of roles.filter((role) => role !== "ADMIN")) {
    const scoped = scopeData(data, { id: "u1", name: "Equipe", email: "equipe@example.com", role });
    assert.equal(scoped.clientes.length, data.clientes.length);
    assert.equal(scoped.veiculos.length, data.veiculos.length);
    assert.equal(scoped.comandas.length, data.comandas.length);
    assert.equal(scoped.agendamentos.length, data.agendamentos.length);
    assert.equal(scoped.configuracao.pixChave, data.configuracao.pixChave);
    assert.deepEqual(scoped.materiais, []);
    assert.deepEqual(scoped.movimentosEstoque, []);
    for (const employee of scoped.funcionarios) {
      assert.notEqual(employee.cargo, "ADMIN");
      assert.equal(employee.email, "");
      assert.equal(employee.comissao, 0);
      assert.equal("acesso" in employee, false);
    }
    for (const order of scoped.comandas) {
      assert.equal(order.comissao, 0);
      assert.equal(order.comissaoPercentual, 0);
    }
  }
  assert.equal(data.funcionarios[0].comissao, 20);
  const admin: User = { id: "admin", name: "Admin", email: "admin@example.com", role: "ADMIN" };
  assert.deepEqual(scopeData(data, admin), data);
});
