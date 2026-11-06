"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import type { Comanda, Servico } from "@/types";
import { dateLabel } from "@/lib/format";
import { duracaoAtendimento, previsaoServicos } from "@/lib/order-timing";

/**
 * Relógio individual: conta da abertura até a conclusão registrada.
 * A duração inclui espera na fila; não inventamos início de lavagem.
 */
export function OrderTimingDetail({ comanda, servicos }: {
  comanda: Comanda;
  servicos: Servico[];
}) {
  const [agora, setAgora] = useState(0);
  const ativo = comanda.status === "AGUARDANDO" || comanda.status === "EM_LAVAGEM";
  useEffect(() => {
    setAgora(Date.now());
    if (!ativo) return;
    const timer = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [ativo, comanda.id]);

  const duracao = duracaoAtendimento(comanda, agora);
  const previsto = previsaoServicos(comanda, servicos);
  const finalizado = comanda.status === "FINALIZADO" || comanda.status === "ENTREGUE";
  const itens = [
    { rotulo: "Entrada do veículo", valor: dateLabel(comanda.createdAt, "dd/MM/yyyy 'às' HH:mm") },
    { rotulo: "Conclusão do atendimento",
      valor: finalizado && comanda.finalizadoEm
        ? dateLabel(comanda.finalizadoEm, "dd/MM/yyyy 'às' HH:mm")
        : comanda.status === "CANCELADO" ? "Cancelada" : "Em andamento" },
    { rotulo: finalizado ? "Duração total registrada" : "Tempo decorrido",
      valor: duracao.texto, destaque: true },
    { rotulo: "Previsão dos serviços", valor: previsto > 0 ? previsto + " min" : "Não informada" },
  ];

  return (
    <section aria-label="Tempo individual da comanda" className="rounded-xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Clock3 size={17} className="text-primary" aria-hidden="true" />
        Tempo deste atendimento
        {ativo && <span className="ml-auto text-xs font-normal text-muted-foreground">Contando</span>}
      </h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {itens.map((item) => (
          <div key={item.rotulo} className="min-w-0 rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">{item.rotulo}</p>
            <p className={"mt-1 break-words font-semibold tabular-nums " +
              (item.destaque ? "text-xl text-primary" : "text-sm")}>
              {item.valor}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        O tempo vai da abertura da comanda até a conclusão, incluindo a espera na fila.
        {finalizado
          ? " O relógio está parado e o resultado permanece no histórico."
          : ativo ? " O relógio será interrompido ao finalizar a comanda."
          : ""}
        {" "}A previsão considera a duração atualmente cadastrada dos serviços.
      </p>
    </section>
  );
}
