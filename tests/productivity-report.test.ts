import { test } from "node:test";
import assert from "node:assert/strict";
import { relatorioProdutividade, produtividadeCsv, formatarDuracaoProdutividade } from "../src/lib/productivity-report";
import type { AppData, Comanda, Veiculo, Funcionario } from "../src/types";

const base = {
  id: "1", numero: 1001, clienteId: "c", veiculoId: "v", funcionarioId: "f",
  status: "FINALIZADO", createdAt: "2026-11-04T20:00:00.000Z",
  finalizadoEm: "2026-11-04T20:45:00.000Z", total: 100,
} as Comanda;
const veiculo = { id: "v", placa: "ABC1D23", tipo: "CARRO" } as Veiculo;
const funcionario = { id: "f", nome: "Equipe" } as Funcionario;
const agora = Date.parse("2026-11-04T23:00:00Z");

test("produtividade contabiliza comandas concluídas, não canceladas nem abertas", () => {
  const data = {
    comandas: [
      base, { ...base, id: "2", status: "CANCELADO" },
      { ...base, id: "3", status: "AGUARDANDO", finalizadoEm: null },
      { ...base, id: "4", numero: 1004, status: "ENTREGUE", createdAt: "2026-11-04T21:00:00Z", finalizadoEm: "2026-11-04T21:15:00Z" },
    ],
    veiculos: [veiculo],
    funcionarios: [funcionario],
  } as Pick<AppData, "comandas" | "veiculos" | "funcionarios">;
  const r = relatorioProdutividade(data, 7, agora);
  assert.equal(r.atendimentos, 2);
  assert.equal(r.carros, 2);
  assert.equal(r.mediaSegundos, 1800);
  assert.equal(formatarDuracaoProdutividade(r.mediaSegundos), "30 min");
});

test("filtra por janela temporal e rejeita término antes da abertura", () => {
  const r = relatorioProdutividade({
    comandas: [
      base,
      { ...base, id: "old", finalizadoEm: "2026-09-01T20:45:00Z" },
      { ...base, id: "invalid", createdAt: "2026-11-04T22:00:00Z", finalizadoEm: "2026-11-04T21:00:00Z" },
    ],
    veiculos: [veiculo], funcionarios: [funcionario],
  }, 7, agora);
  assert.equal(r.atendimentos, 1);
});

test("CSV contém cabeçalho e neutraliza fórmula em dados fornecidos pelo usuário", () => {
  const r = relatorioProdutividade({
    comandas: [base],
    veiculos: [{ ...veiculo, placa: "=HYPERLINK(1)" }],
    funcionarios: [funcionario],
  }, 7, agora);
  const csv = produtividadeCsv(r);
  assert.match(csv, /Comanda/);
  assert.match(csv, /"'=HYPERLINK\(1\)"/);
  assert.match(csv, /1001/);
});
