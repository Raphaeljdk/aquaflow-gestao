import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/forms/order-form.tsx", "utf8");
const inicio = source.indexOf("  const transition = async (status: Status) => {");
const fim = source.indexOf("  async function documentoVistoria()", inicio);
const transition = source.slice(inicio, fim);

test("botões de início e finalização utilizam a mesma transição que confirma gravação", () => {
  assert.ok(inicio >= 0 && fim > inicio);
  assert.match(source, /onClick=\{\(\) => void transition\("EM_LAVAGEM"\)\}/);
  assert.match(source, /onClick=\{\(\) => void transition\("FINALIZADO"\)\}/);
  assert.match(transition, /if\s*\(\s*await mutate\(\{/);
});

test("gaveta fecha somente depois de mutate retornar sucesso", () => {
  const success = transition.indexOf("if (status === \"CANCELADO\") setCancel(false);");
  const close = transition.indexOf('if (status === "EM_LAVAGEM" || status === "FINALIZADO") onClose();');
  assert.ok(success >= 0 && close > success, "fechamento deve estar dentro do bloco de sucesso");
  assert.match(transition, /if\s*\(\s*await mutate\(\{[\s\S]*?\}\)\s*\)\s*\{[\s\S]*?onClose\(\);[\s\S]*?\}\s*;/);
});

test("mantém painel aberto ao falhar e não fecha automaticamente ao cancelar", () => {
  assert.doesNotMatch(transition, /finally\s*\{\s*onClose\(\)/);
  assert.doesNotMatch(transition, /if\s*\(status === "CANCELADO"\) onClose\(\)/);
  assert.match(source, /<Sheet open=\{!!id\} onOpenChange=\{\(v\) => !v && onClose\(\)\}/);
});
