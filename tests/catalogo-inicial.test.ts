import test from "node:test";
import assert from "node:assert/strict";
import { catalogoInicial, deveCriarCatalogoInicial } from "../src/lib/catalogo-inicial";
import { servicoSchema } from "../src/lib/validations";

test("catálogo provisório contém os preços pedidos e serviços editáveis", () => {
  const byName = Object.fromEntries(catalogoInicial.map((s) => [s.nome, s]));
  assert.equal(byName["Lavagem completa com cera"].preco, 50);
  assert.equal(byName["Secagem e pretinho"].preco, 25);
  assert.equal(byName["Pacote especial"].preco, 115);
  assert.ok(byName["Pacote especial"].descricao.includes("Confirmar"));
  assert.equal(new Set(catalogoInicial.map((s) => s.id)).size, catalogoInicial.length);
  catalogoInicial.forEach(({ id: _id, ...servico }) => {
    assert.equal(servicoSchema.safeParse(servico).success, true, servico.nome);
  });
});
test("catálogo inicial é inserido somente se banco não tiver nenhum serviço", () => {
  assert.equal(deveCriarCatalogoInicial(0), true);
  assert.equal(deveCriarCatalogoInicial(1), false);
  assert.equal(deveCriarCatalogoInicial(22), false);
});
