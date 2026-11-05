import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { estoqueLivre, quantidadeReservada, permiteEditarProdutos, subtotalMercadorias } from "../src/lib/product-sales-policy";
import { makeDemoData } from "../src/lib/demo-data";
import { applyMutation } from "../src/lib/domain";
import type { User } from "../src/types";

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

test("a comissão de lavagem não considera mercadorias vendidas", () => {
  const now = new Date("2026-11-04T20:00:00.000Z");
  const actor: User = { id:"adm", name:"Gestor", email:"gestor@example.com", role:"ADMIN" };
  const d=makeDemoData(now);
  d.configuracao.nome = "Lava Rápido QA";
  d.configuracao.pixRecebimentoChave = "+5511999999999";
  d.configuracao.pixRecebimentoAtivo = true;
  d.comandas=[];
  const created=applyMutation(d,{entity:"comandas",method:"POST",
    data:{clienteId:"c1",veiculoId:"v1",servicoIds:["s1"],funcionarioId:"f1",desconto:0}},actor,now);
  created.comandas[0].total+=14; // Simula duas latas a R$7, preservando os serviços.
  const id=created.comandas[0].id;
  const washing=applyMutation(created,{entity:"comandas",method:"PATCH",id,data:{status:"EM_LAVAGEM"}},actor,now);
  const finished=applyMutation(washing,{entity:"comandas",method:"PATCH",id,
    data:{status:"FINALIZADO",formaPagamento:"PIX",pixConfirmadoManualmente:true}},actor,now);
  assert.equal(finished.comandas[0].total,99);
  assert.equal(finished.comandas[0].comissao,12.75);
});
