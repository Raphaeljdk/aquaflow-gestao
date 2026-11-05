"use client";

import { useMemo, useState } from "react";
import { BarChart3, Download, Clock3 } from "lucide-react";
import type { AppData } from "@/types";
import {
  formatarDuracaoProdutividade,
  produtividadeCsv,
  relatorioProdutividade,
  type PeriodoProdutividade,
} from "@/lib/productivity-report";
import { Button } from "@/components/ui/button";

export function OrderProductivity({ data, now }: { data: AppData; now: number }) {
  const [periodo, setPeriodo] = useState<PeriodoProdutividade>(7);
  const relatorio = useMemo(
    () => relatorioProdutividade(data, periodo, now),
    [data, periodo, now],
  );
  function exportar() {
    const arquivo = new Blob([produtividadeCsv(relatorio)], {
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
          <p className="mt-1 text-xs text-muted-foreground">
            Tempo real da abertura até ficar pronto para retirada.
            Apenas comandas concluídas deste lava-rápido.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="periodo-produtividade" className="text-xs text-muted-foreground">Período</label>
          <select id="periodo-produtividade" aria-label="Período do relatório" className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
            value={periodo} onChange={(event) => setPeriodo(Number(event.target.value) as PeriodoProdutividade)}>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <Button size="sm" variant="outline" disabled={!relatorio.atendimentos} onClick={exportar}>
            <Download size={14} aria-hidden="true" /> Exportar CSV
          </Button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Atendimentos concluídos", value: String(relatorio.atendimentos) },
          { label: "Carros", value: String(relatorio.carros) },
          { label: "Motos / caminhonetes", value: relatorio.motos + " / " + relatorio.caminhonetes },
          { label: "Tempo médio", value: formatarDuracaoProdutividade(relatorio.mediaSegundos) },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>
      {relatorio.atendimentos === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Nenhum atendimento finalizado no período selecionado.
        </p>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock3 size={13} aria-hidden="true" />
          Contabilizados {relatorio.atendimentos} atendimentos com horário de entrada e de conclusão válidos.
          Inclui o tempo de espera na fila.
        </p>
      )}
    </section>
  );
}
