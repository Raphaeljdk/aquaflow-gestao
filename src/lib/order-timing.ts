import type { Comanda, Servico } from "@/types";

/** Formato horas:minutos:segundos para tempos reais (inclusive acima de 24 horas). */
export function formatarDuracaoHms(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos < 0) return "—";
  const inteiros = Math.floor(segundos);
  return [Math.floor(inteiros / 3600), Math.floor((inteiros % 3600) / 60), inteiros % 60]
    .map(n => String(n).padStart(2, "0")).join(":");
}

/** Tempo real da comanda a partir dos registros persistidos. */
export function duracaoAtendimento(o: Comanda, now: number): { texto: string; segundos: number } {
  const inicial = new Date(o.createdAt).getTime();
  const pronto = o.status === "FINALIZADO" || o.status === "ENTREGUE";
  if (o.status === "CANCELADO" || !Number.isFinite(inicial) ||
      (pronto && !o.finalizadoEm) || (!pronto && !now)) {
    return { texto: "—", segundos: 0 };
  }
  const final = pronto ? new Date(o.finalizadoEm!).getTime() : now;
  if (!Number.isFinite(final)) return { texto: "—", segundos: 0 };
  const segundos = Math.max(0, Math.floor((final - inicial) / 1000));
  return { texto: formatarDuracaoHms(segundos), segundos };
}

/** Soma as durações configuradas em cada serviço do próprio lava-rápido. */
export function previsaoServicos(o: Comanda, servicos: Servico[]): number {
  return o.itens.reduce((total, item) => {
    const referencia = servicos.find(s => s.id === item.servicoId);
    return total + (referencia?.duracaoMin ?? 0) * item.quantidade;
  }, 0);
}
