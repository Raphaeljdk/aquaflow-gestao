"use client";

import { useMemo, useState } from "react";
import { BarChart3, Download, Clock3, Search } from "lucide-react";
import type { AppData } from "@/types";
import {
  formatarDuracaoProdutividade,
  produtividadeCsv,
  relatorioProdutividade,
  type PeriodoProdutividade,
} from "@/lib/productivity-report";
import { formatarDuracaoHms } from "@/lib/order-timing";
import { dateLabel, money } from "@/lib/format";
import { Button } from "@/components/ui/button";

const porPagina = 10;
const tipoLabel = {
  CARRO: "Carro",
  MOTO: "Moto",
  CAMINHONETE: "Caminhonete",
  DESCONHECIDO: "Não informado",
} as const;

export function OrderProductivity({ data, now }: { data: AppData; now: number }) {
  const [periodo, setPeriodo] = useState<PeriodoProdutividade>(7);
  const [consulta, setConsulta] = useState("");
  const [pagina, setPagina] = useState(0);
  const relatorio = useMemo(
    () => relatorioProdutividade(data, periodo, now),
    [data, periodo, now],
  );
  const filtradas = useMemo(() => {
    const termo = consulta.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return relatorio.linhas;
    return relatorio.linhas.filter((linha) => [
      String(linha.numero), linha.placa, linha.cliente, linha.veiculo,
      linha.funcionario, linha.servicos, tipoLabel[linha.tipo],
    ].some((item) => item.toLocaleLowerCase("pt-BR").includes(termo)));
  }, [relatorio.linhas, consulta]);
  const paginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const paginaAtual = Math.min(pagina, paginas - 1);
  const visiveis = filtradas.slice(paginaAtual * porPagina, (paginaAtual + 1) * porPagina);

  function exportar() {
    // O CSV acompanha os filtros exibidos na tabela, sem exportar outros lava-rápidos.
    const arquivo = new Blob([produtividadeCsv({ ...relatorio, linhas: filtradas })], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url;
    link.download = "produtividade-lavagens-" + periodo + "-dias.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className="panel mb-5 p-4 sm:p-5" aria-label="Relatório de produtividade das lavagens">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <BarChart3 size={18} aria-hidden="true" /> Produtividade das lavagens
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Duração individual da entrada até ficar pronto para retirada, incluindo espera.
            Apenas comandas concluídas deste lava-rápido.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="periodo-produtividade" className="text-xs text-muted-foreground">Período</label>
          <select id="periodo-produtividade" aria-label="Período do relatório"
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
            value={periodo} onChange={(event) => {
              setPeriodo(Number(event.target.value) as PeriodoProdutividade);
              setPagina(0);
            }}>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <Button size="sm" variant="outline" disabled={!filtradas.length} onClick={exportar}>
            <Download size={14} aria-hidden="true" /> Exportar CSV
          </Button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Veículos concluídos", value: String(relatorio.atendimentos) },
          { label: "Carros", value: String(relatorio.carros) },
          { label: "Motos / caminhonetes", value: relatorio.motos + " / " + relatorio.caminhonetes },
          { label: "Tempo médio por veículo", value: formatarDuracaoProdutividade(relatorio.mediaSegundos) },
          { label: "Tempo total somado", value: formatarDuracaoHms(relatorio.totalSegundos) },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 break-words text-lg font-semibold tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 border-t border-border pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Tempo por veículo</h3>
            <p className="text-xs text-muted-foreground">
              {filtradas.length} de {relatorio.linhas.length} comandas no período · mais recentes primeiro
            </p>
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <Search size={16} aria-hidden="true"
              className="pointer-events-none absolute left-3 top-3 text-muted-foreground" />
            <span className="sr-only">Buscar comanda no relatório</span>
            <input type="search" value={consulta} aria-label="Buscar comanda no relatório"
              placeholder="Buscar placa, cliente, serviço..."
              onChange={(event) => { setConsulta(event.target.value); setPagina(0); }}
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm" />
          </label>
        </div>
        {relatorio.atendimentos === 0 ? (
          <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
            Nenhum atendimento finalizado no período selecionado.
          </p>
        ) : filtradas.length === 0 ? (
          <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
            Nenhuma comanda encontrada. Ajuste a busca ou o período.
          </p>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {visiveis.map((linha) => (
                <article key={linha.numero} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">#{linha.numero} · {linha.placa}</p>
                      <p className="text-xs text-muted-foreground">{linha.veiculo} · {tipoLabel[linha.tipo]}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{linha.cliente} · {linha.funcionario}</p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-primary">
                      {formatarDuracaoHms(linha.segundos)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{linha.servicos}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-2 text-xs">
                    <div><p className="text-muted-foreground">Entrada</p><p>{dateLabel(linha.aberturaEm, "dd/MM/yyyy HH:mm")}</p></div>
                    <div><p className="text-muted-foreground">Conclusão</p><p>{dateLabel(linha.finalizadoEm, "dd/MM/yyyy HH:mm")}</p></div>
                  </div>
                  <p className="mt-2 text-right text-xs text-muted-foreground">Total: {money(linha.total)}</p>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-3 font-medium">Comanda / veículo</th>
                    <th scope="col" className="px-3 py-3 font-medium">Cliente</th>
                    <th scope="col" className="px-3 py-3 font-medium">Serviço</th>
                    <th scope="col" className="px-3 py-3 font-medium">Responsável</th>
                    <th scope="col" className="px-3 py-3 font-medium">Entrada</th>
                    <th scope="col" className="px-3 py-3 font-medium">Conclusão</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Duração</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((linha) => (
                    <tr key={linha.numero} className="border-t border-border align-top">
                      <td className="px-3 py-3">
                        <p className="font-semibold">#{linha.numero} · {linha.placa}</p>
                        <p className="text-xs text-muted-foreground">{linha.veiculo} · {tipoLabel[linha.tipo]}</p>
                      </td>
                      <td className="px-3 py-3">{linha.cliente}</td>
                      <td className="max-w-[240px] px-3 py-3">
                        <p title={linha.servicos} className="line-clamp-2 text-xs">{linha.servicos}</p>
                      </td>
                      <td className="px-3 py-3">{linha.funcionario}</td>
                      <td className="whitespace-nowrap px-3 py-3 tabular-nums">{dateLabel(linha.aberturaEm, "dd/MM/yyyy HH:mm")}</td>
                      <td className="whitespace-nowrap px-3 py-3 tabular-nums">{dateLabel(linha.finalizadoEm, "dd/MM/yyyy HH:mm")}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-primary">
                        {formatarDuracaoHms(linha.segundos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Mostrando {paginaAtual * porPagina + 1}–{Math.min((paginaAtual + 1) * porPagina, filtradas.length)} de {filtradas.length}</span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline"
                  disabled={paginaAtual === 0} onClick={() => setPagina(paginaAtual - 1)}>Anterior</Button>
                <span className="self-center tabular-nums">{paginaAtual + 1} / {paginas}</span>
                <Button type="button" size="sm" variant="outline"
                  disabled={paginaAtual + 1 >= paginas} onClick={() => setPagina(paginaAtual + 1)}>Próxima</Button>
              </div>
            </div>
          </>
        )}
        <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
          <Clock3 size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          O tempo médio é por veículo. O tempo total é a soma das durações individuais,
          podendo incluir atendimentos simultâneos e tempo aguardando na fila.
          Não representa horas de funcionamento nem apenas a lavagem efetiva.
        </p>
      </div>
    </section>
  );
}
