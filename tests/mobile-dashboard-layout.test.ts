import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dashboard adapta indicadores e fila no telefone sem remover versão desktop", () => {
  const file = readFileSync("src/components/dashboard.tsx", "utf8");
  assert.match(file, /mb-5 grid grid-cols-2 gap-2\.5/);
  assert.match(file, /divide-y divide-border sm:hidden/);
  assert.match(file, /hidden sm:block/);
  assert.match(file, /aria-label=\{"Abrir comanda "/);
});
test("menu mobile evita botão de comanda duplicado no dashboard", () => {
  const file = readFileSync("src/components/layout/app-shell.tsx", "utf8");
  assert.match(file, /path === "\/dashboard" && "hidden sm:inline-flex"/);
  assert.match(file, /env\(safe-area-inset-bottom\)/);
});
