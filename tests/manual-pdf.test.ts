import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("central de ajuda oferece PDF mesmo sem URL configurada", () => {
  const help = readFileSync("src/app/(dashboard)/como-usar/page.tsx", "utf8");
  assert.match(help, /manualPdfUrl \|\| "\/api\/manual"/);
  assert.match(help, /Abrir manual em PDF/);
  for(const label of ["Visão geral","Clientes","Comandas","Agendamentos","Estoque","Serviços","Funcionários","Faturamento","Configurações","Como usar"])
    assert.ok(help.includes(label), label);
});
test("manual em PDF é gerado no servidor e não contém dados de clientes", () => {
  const code=readFileSync("src/app/api/manual/route.ts","utf8");
  assert.match(code,/jspdf/);
  assert.match(code,/Content-Type/);
  assert.match(code,/application\/pdf/);
  assert.match(code,/return new Response/);
  assert.doesNotMatch(code,/findMany\(|prisma\./);
});
