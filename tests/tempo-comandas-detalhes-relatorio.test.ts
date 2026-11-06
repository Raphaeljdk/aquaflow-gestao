import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { duracaoAtendimento, formatarDuracaoHms } from "../src/lib/order-timing";
import { produtividadeCsv, relatorioProdutividade } from "../src/lib/productivity-report";
import type { AppData, Comanda, Veiculo, Funcionario, Cliente } from "../src/types";

const aguardando = {
  id: "order-1", numero: 1045, clienteId: "c-1", veiculoId: "v-1",
  funcionarioId: "f-1", status: "AGUARDANDO", total: 80,
  createdAt: "2026-11-06T13:00:00.000Z", finalizadoEm: null,
  itens: [{ servicoId: "s-1", nome: "Lavagem simples", quantidade: 1, preco: 80 }],
} as Comanda;
const agora = Date.parse("2026-11-06T14:15:35.000Z");

test("tempo individual avança na fila e congela na conclusão e na entrega", () => {
  assert.deepEqual(duracaoAtendimento(aguardando, agora),
    { texto: "01:15:35", segundos: 4535 });
  const finalizada = { ...aguardando, status: "FINALIZADO", finalizadoEm: "2026-11-06T14:05:00.000Z" } as Comanda;
  assert.equal(duracaoAtendimento(finalizada, agora).texto, "01:05:00");
  assert.equal(duracaoAtendimento(finalizada, agora + 36000000).texto, "01:05:00");
  assert.equal(duracaoAtendimento({ ...finalizada, status: "ENTREGUE" }, agora + 36000000).texto, "01:05:00");
  assert.equal(duracaoAtendimento({ ...aguardando, status: "CANCELADO" }, agora).texto, "—");
  assert.equal(formatarDuracaoHms(24 * 3600 + 61), "24:01:01");
  assert.equal(formatarDuracaoHms(-1), "—");
});

test("relatório conserva duração e horários por veículo, incluindo dados de cliente e serviço", () => {
  const data = {
    comandas: [
      { ...aguardando, status: "FINALIZADO", finalizadoEm: "2026-11-06T14:05:00.000Z" },
      { ...aguardando, id: "order-2", numero: 1046, status: "EM_LAVAGEM", veiculoId: "v-2" },
    ] as Comanda[],
    veiculos: [
      { id: "v-1", placa: "ABC1D23", tipo: "CARRO", marca: "Fiat", modelo: "Uno" },
    ] as Veiculo[],
    clientes: [{ id: "c-1", nome: "=WEBSERVICE(1)" }] as Cliente[],
    funcionarios: [{ id: "f-1", nome: "João" }] as Funcionario[],
  } as Pick<AppData, "comandas" | "veiculos" | "funcionarios" | "clientes">;
  const relatorio = relatorioProdutividade(data, 7, agora);
  assert.equal(relatorio.atendimentos, 1);
  assert.equal(relatorio.totalSegundos, 3900);
  assert.equal(relatorio.mediaSegundos, 3900);
  assert.equal(relatorio.linhas[0].placa, "ABC1D23");
  assert.equal(relatorio.linhas[0].veiculo, "Fiat Uno");
  assert.equal(relatorio.linhas[0].cliente, "=WEBSERVICE(1)");
  assert.equal(relatorio.linhas[0].servicos, "1× Lavagem simples");
  assert.equal(relatorio.linhas[0].aberturaEm, aguardando.createdAt);
  const csv = produtividadeCsv(relatorio);
  assert.match(csv, /Duração \(HH:MM:SS\)/);
  assert.match(csv, /01:05:00/);
  assert.match(csv, /Fiat Uno/);
  assert.match(csv, /"'=WEBSERVICE\(1\)"/);
});

test("gaveta mostra horas e duração e relatório por veículo é acessível na área de faturamento", () => {
  const detalhe = readFileSync("src/components/forms/order-form.tsx", "utf8");
  const painel = readFileSync("src/components/order-timing-detail.tsx", "utf8");
  const lista = readFileSync("src/components/order-productivity.tsx", "utf8");
  const relatorios = readFileSync("src/components/reports.tsx", "utf8");
  assert.match(detalhe, /<OrderTimingDetail key=\{o\.id\}/);
  assert.match(painel, /Entrada do veículo/);
  assert.match(painel, /Conclusão do atendimento/);
  assert.match(painel, /Duração total registrada/);
  assert.match(painel, /1000/); // tick de um segundo enquanto o atendimento está ativo
  assert.match(lista, /Tempo por veículo/);
  assert.match(lista, /Buscar comanda no relatório/);
  assert.match(lista, /Mostrando /);
  assert.match(lista, /Exportar CSV/);
  assert.match(relatorios, /<OrderProductivity data=\{data\} now=\{agoraRelatorio\}/);
});
