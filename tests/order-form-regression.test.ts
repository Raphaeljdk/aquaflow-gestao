import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/forms/order-form.tsx", "utf8");

test("atualização periódica não reinicia uma comanda em preenchimento", () => {
  assert.match(source, /initializedFor\.current === session/);
  assert.match(source, /initializedFor\.current = session/);
  assert.match(source, /initializedFor\.current = null/);
  assert.match(source, /form\.reset\(/);
});

test("não permite comanda sem serviço ativo e orienta o responsável", () => {
  assert.match(source, /!activeServices\.length/);
  assert.match(source, /Configurar serviços/);
  assert.match(source, /Peça ao administrador/);
});

test("impede envio duplicado do atendimento rápido", () => {
  assert.match(source, /quickSubmitLock\.current/);
  assert.match(source, /quickSubmitLock\.current = true/);
  assert.match(source, /quickSubmitLock\.current = false/);
});

test("criação rápida adiciona à fila sem fingir início da lavagem", () => {
  assert.match(source, /Criar comanda e adicionar à fila/);
});
