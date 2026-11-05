import type { AppData, Comanda } from "@/types";

export type PeriodoProdutividade = 7 | 30 | 90;
export interface LinhaProdutividade {
  numero: number;
  placa: string;
  tipo: "CARRO" | "MOTO" | "CAMINHONETE" | "DESCONHECIDO";
  funcionario: string;
  aberturaEm: string;
  finalizadoEm: string;
  segundos: number;
  total: number;
}
export interface RelatorioProdutividade {
  atendimentos: number;
  carros: number;
  motos: number;
  caminhonetes: number;
  mediaSegundos: number;
  totalSegundos: number;
  receita: number;
  linhas: LinhaProdutividade[];
}

/**
 * Indicadores com base em datas reais persistidas no banco do lava-rápido atual.
 * Não usa duração prevista para fabricar tempos reais.
 * Período móvel: últimos N dias contados do instante atual.
 */
export function relatorioProdutividade(
  data: Pick<AppData, "comandas" | "veiculos" | "funcionarios">,
  periodoDias: PeriodoProdutividade,
  agora: number,
): RelatorioProdutividade {
  const inicio = agora - periodoDias * 86400000;
  const linhas: LinhaProdutividade[] = [];
  for (const comanda of data.comandas) {
    if (!["FINALIZADO", "ENTREGUE"].includes(comanda.status) || !comanda.finalizadoEm) continue;
    const abertura = Date.parse(comanda.createdAt);
    const pronto = Date.parse(comanda.finalizadoEm);
    if (!Number.isFinite(abertura) || !Number.isFinite(pronto) || pronto < abertura ||
      pronto < inicio || pronto > agora) continue;
    const v = data.veiculos.find((v) => v.id === comanda.veiculoId);
    const f = data.funcionarios.find((f) => f.id === comanda.funcionarioId);
    linhas.push({
      numero: comanda.numero,
      placa: v?.placa || "Não informada",
      tipo: v?.tipo || "DESCONHECIDO",
      funcionario: f?.nome || "Não atribuído",
      aberturaEm: comanda.createdAt,
      finalizadoEm: comanda.finalizadoEm,
      segundos: Math.floor((pronto - abertura) / 1000),
      total: Number(comanda.total) || 0,
    });
  }
  linhas.sort((a, b) => b.finalizadoEm.localeCompare(a.finalizadoEm));
  const totalSegundos = linhas.reduce((sum, item) => sum + item.segundos, 0);
  return {
    atendimentos: linhas.length,
    carros: linhas.filter((item) => item.tipo === "CARRO").length,
    motos: linhas.filter((item) => item.tipo === "MOTO").length,
    caminhonetes: linhas.filter((item) => item.tipo === "CAMINHONETE").length,
    mediaSegundos: linhas.length ? Math.round(totalSegundos / linhas.length) : 0,
    totalSegundos,
    receita: linhas.reduce((sum, item) => sum + item.total, 0),
    linhas,
  };
}
export function formatarDuracaoProdutividade(segundos: number): string {
  if (segundos < 0 || !Number.isFinite(segundos)) return "—";
  const minutos = Math.floor(segundos / 60);
  return minutos >= 60
    ? Math.floor(minutos / 60) + "h " + (minutos % 60) + "min"
    : minutos + " min";
}
function celulaCsv(valor: string | number): string {
  let texto = String(valor);
  // Impedir injeção de fórmula em planilhas ao abrir CSV.
  if (/^[\s]*[=+@\-\t\r]/.test(texto)) texto = "'" + texto;
  return '"' + texto.replace(/"/g, '""') + '"';
}
export function produtividadeCsv(relatorio: RelatorioProdutividade): string {
  const header = ["Comanda", "Placa", "Tipo", "Funcionário", "Abertura", "Pronto", "Minutos", "Total (R$)"];
  const linhas = relatorio.linhas.map((linha) => [
    linha.numero, linha.placa, linha.tipo, linha.funcionario,
    linha.aberturaEm, linha.finalizadoEm, (linha.segundos / 60).toFixed(1),
    linha.total.toFixed(2),
  ]);
  return "\ufeff" + [header, ...linhas].map((row) => row.map(celulaCsv).join(";")).join("\r\n");
}
