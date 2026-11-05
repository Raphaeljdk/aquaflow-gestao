import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { estoqueLivre, quantidadeReservada, permiteEditarProdutos, subtotalMercadorias } from "../src/lib/product-sales-policy";

test("a reserva protege unidades de mais de uma comanda ativa", () => {
  assert.equal(quantidadeReservada([{ quantidade: 2 }, { quantidade: 3 }]), 5);
  assert.equal(estoqueLivre(6, [{ quantidade: 2 }, { quantidade: 3 }]), 1);
  assert.equal(estoqueLivre(5, [{ quantidade: 2 }, { quantidade: 3 }]), 0);
  assert.ok(estoqueLivre(4, [{ quantidade: 2 }, { quantidade: 3 }]) < 1);
});
test("produtos não podem ser adicionados depois da finalização", () => {
  assert.equal(permiteEditarProdutos("AGUARDANDO"), true);
  assert.equal(permiteEditarProdutos("EM_LAVAGEM"), true);
  assert.equal(permiteEditarProdutos("FINALIZADO"), false);
  assert.equal(permiteEditarProdutos("ENTREGUE"), false);
  assert.equal(permiteEditarProdutos("CANCELADO"), false);
});
test("duas latas a R$7 custam R$14, sem depender de duração", () => {
  assert.equal(subtotalMercadorias(7, 2), 1400);
  assert.equal(subtotalMercadorias(0.1, 3), 30);
  assert.throws(() => subtotalMercadorias(-1, 2), /inválida/);
  assert.throws(() => subtotalMercadorias(7, 1.5), /inválida/);
});
test("migração é aditiva, mantém os serviços e cria rastreabilidade de vendas", () => {
  const sql = readFileSync("prisma/migrations/202611050240_produtos_venda_comanda/migration.sql", "utf8");
  const repo = readFileSync("src/lib/repository.ts", "utf8");
  const api = readFileSync("src/app/api/comandas/[id]/produtos/route.ts", "utf8");
  assert.match(sql, /CREATE TABLE "Produto"/);
  assert.match(sql, /CREATE TABLE "ItemProdutoComanda"/);
  assert.match(sql, /CREATE TABLE "MovimentoProduto"/);
  assert.match(sql, /requestId/);
  assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE|DELETE FROM/i);
  assert.match(repo, /baixadoEm: null/);
  assert.match(repo, /pg_advisory_xact_lock/);
  assert.match(api, /requestId: input.requestId/);
});
