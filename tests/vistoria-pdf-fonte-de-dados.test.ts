import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gerarPdfVistoria } from "../src/lib/inspection-report";

const source = (path: string) => readFileSync(path, "utf8");

test("PDF de vistoria diferencia oito pontos revisados de duas avarias", async () => {
  const ids = [
    "PARACHOQUES", "FAROIS", "PINTURA", "RETROVISORES",
    "VIDROS", "AMASSADOS", "RODAS_PNEUS", "INTERIOR",
  ] as const;
  const pdf = await gerarPdfVistoria({
    numero: 1001,
    estabelecimento: "Lava Rápido de Teste",
    cliente: "Cliente Teste",
    telefone: "11999999999",
    veiculo: "Carro Teste",
    placa: "ABC1D23",
    criadoEm: "2026-11-18T18:00:00Z",
    vistoria: {
      atualizadoEm: "2026-11-18T18:10:00Z",
      observacoesGerais: "",
      itens: ids.map((id, i) => ({
        id,
        revisado: true,
        defeito: i < 2,
        observacao: i === 0 ? "Risco no para-choque" : i === 1 ? "Farol trincado" : "",
      })),
    },
  });
  const rawPdf = Buffer.from(await pdf.arrayBuffer()).toString("latin1");
  assert.match(rawPdf, /Revisados: 8\\/8/);
  assert.match(rawPdf, /Avarias: 2/);
  assert.match(rawPdf, /Sem avaria: 6/);
  assert.equal((rawPdf.match(/AVARIA REGISTRADA/g) ?? []).length, 2);
  assert.match(rawPdf, /Risco no para-choque/);
  assert.match(rawPdf, /Farol trincado/);
});

test("PDF de vistoria em produção consulta a persistência, não o snapshot da tela", () => {
  const ui = source("src/components/forms/order-form.tsx");
  const api = source("src/app/api/comandas/[id]/pdf/route.ts");
  const repository = source("src/lib/comanda-documento.ts");

  assert.match(ui, /pdf\\?tipo=vistoria/);
  assert.match(ui, /cache: "no-store"/);
  assert.match(api, /tipo === "vistoria"/);
  assert.match(repository, /vistoria\\.itens\\.length !== 8/);
  assert.match(repository, /vistoria\\.itens\\.some\\(item => !item\\.revisado\\)/);
  assert.match(repository, /Conclua e salve os oito pontos/);
  assert.match(repository, /resumoComanda: somenteVistoria \\? undefined :/);
  assert.match(ui, /if \\(DEMO\\)/);
});
