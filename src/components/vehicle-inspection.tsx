"use client";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  Save,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  ItemVistoria,
  Vistoria,
  VistoriaItemId,
} from "@/types";

const pontos: Array<{
  id: VistoriaItemId;
  label: string;
  detalhe: string;
  x: number;
  y: number;
}> = [
  { id: "PARACHOQUES", label: "Para-choques", detalhe: "Trincas, riscos ou partes soltas", x: 50, y: 10 },
  { id: "FAROIS", label: "Faróis e lanternas", detalhe: "Quebras, trincas ou infiltração", x: 74, y: 20 },
  { id: "PINTURA", label: "Pintura e riscos", detalhe: "Riscos, manchas e descascados", x: 24, y: 34 },
  { id: "RETROVISORES", label: "Retrovisores", detalhe: "Quebras, folgas ou riscos", x: 80, y: 39 },
  { id: "VIDROS", label: "Vidros", detalhe: "Trincas, lascas ou riscos", x: 50, y: 48 },
  { id: "AMASSADOS", label: "Lataria e amassados", detalhe: "Mossas e deformações", x: 22, y: 63 },
  { id: "RODAS_PNEUS", label: "Rodas e pneus", detalhe: "Riscos, cortes ou danos aparentes", x: 78, y: 72 },
  { id: "INTERIOR", label: "Interior e objetos", detalhe: "Objetos deixados e avarias internas", x: 50, y: 86 },
];

function novoChecklist(): ItemVistoria[] {
  return pontos.map((p) => ({
    id: p.id,
    revisado: false,
    defeito: false,
    observacao: "",
  }));
}

export function VehicleInspection({
  value,
  busy,
  readOnly = false,
  onSave,
}: {
  value: Vistoria | null;
  busy: boolean;
  readOnly?: boolean;
  onSave: (vistoria: Omit<Vistoria, "atualizadoEm">) => Promise<boolean>;
}) {
  const [itens, setItens] = useState<ItemVistoria[]>(novoChecklist);
  const [observacoesGerais, setObservacoesGerais] = useState("");

  useEffect(() => {
    setItens(value?.itens?.length === pontos.length ? value.itens : novoChecklist());
    setObservacoesGerais(value?.observacoesGerais ?? "");
  }, [value]);

  const revisados = itens.filter((x) => x.revisado).length;
  const defeitos = itens.filter((x) => x.revisado && x.defeito).length;
  const concluida = revisados === pontos.length;

  const byId = useMemo(
    () => new Map(itens.map((item) => [item.id, item])),
    [itens],
  );

  const marcar = (id: VistoriaItemId, defeito: boolean) => {
    if (readOnly) return;
    setItens((atual) =>
      atual.map((item) =>
        item.id === id ? { ...item, revisado: true, defeito } : item,
      ),
    );
  };

  const observacao = (id: VistoriaItemId, texto: string) => {
    setItens((atual) =>
      atual.map((item) =>
        item.id === id ? { ...item, observacao: texto } : item,
      ),
    );
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-black p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-black">
            <ClipboardCheck size={21} />
          </div>
          <div>
            <h3 className="font-semibold">Vistoria de entrada</h3>
            <p className="text-xs text-white/55">
              Marque os pontos antes da lavagem para registrar avarias existentes.
            </p>
          </div>
        </div>
        <div className="rounded-full border border-white/15 px-3 py-1 text-xs">
          {revisados}/{pontos.length} revisados · {defeitos} defeito{defeitos === 1 ? "" : "s"}
        </div>
      </div>

      <div className="grid gap-5 p-4 lg:grid-cols-[220px_1fr]">
        <div className="rounded-2xl border border-border bg-black p-4">
          <div className="relative mx-auto h-[330px] w-[170px]">
            <svg
              viewBox="0 0 170 330"
              className="h-full w-full"
              aria-label="Desenho do veículo para vistoria"
            >
              <rect x="38" y="12" width="94" height="306" rx="40" fill="#171717" stroke="#facc15" strokeWidth="2" />
              <rect x="50" y="62" width="70" height="72" rx="24" fill="#262626" stroke="#ffffff" strokeOpacity=".38" />
              <rect x="50" y="196" width="70" height="72" rx="24" fill="#262626" stroke="#ffffff" strokeOpacity=".38" />
              <path d="M52 143h66v44H52z" fill="#0a0a0a" stroke="#ffffff" strokeOpacity=".28" />
              <rect x="29" y="75" width="10" height="58" rx="5" fill="#3f3f46" />
              <rect x="131" y="75" width="10" height="58" rx="5" fill="#3f3f46" />
              <rect x="29" y="198" width="10" height="58" rx="5" fill="#3f3f46" />
              <rect x="131" y="198" width="10" height="58" rx="5" fill="#3f3f46" />
              <path d="M61 24h48M61 306h48" stroke="#facc15" strokeWidth="5" strokeLinecap="round" />
            </svg>
            {pontos.map((p) => {
              const item = byId.get(p.id);
              const state = !item?.revisado ? "pendente" : item.defeito ? "defeito" : "ok";
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={readOnly}
                  onClick={() => marcar(p.id, !(item?.revisado && item.defeito))}
                  className={
                    "absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-lg transition " +
                    (state === "defeito"
                      ? "border-primary bg-primary text-black shadow-yellow-500/20"
                      : state === "ok"
                        ? "border-white bg-white text-black"
                        : "border-white/35 bg-black text-white/70")
                  }
                  style={{ left: p.x + "%", top: p.y + "%" }}
                  aria-label={p.label + ": " + state}
                  title={p.label}
                >
                  {state === "defeito" ? "!" : state === "ok" ? <Check size={13} /> : "•"}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-center gap-3 text-[11px] text-white/60">
            <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-white" /> OK</span>
            <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-primary" /> Defeito</span>
          </div>
        </div>

        <div className="space-y-3">
          {pontos.map((p) => {
            const item = byId.get(p.id)!;
            return (
              <div
                key={p.id}
                className={
                  "rounded-xl border p-3 transition " +
                  (item.revisado && item.defeito
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background/40")
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-[180px] flex-1">
                    <p className="text-sm font-semibold">{p.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.detalhe}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={item.revisado && !item.defeito ? "default" : "outline"}
                      disabled={readOnly}
                      onClick={() => marcar(p.id, false)}
                      className="h-8"
                    >
                      <Check size={14} />
                      OK
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={item.revisado && item.defeito ? "default" : "outline"}
                      disabled={readOnly}
                      onClick={() => marcar(p.id, true)}
                      className="h-8"
                    >
                      <AlertTriangle size={14} />
                      Defeito
                    </Button>
                  </div>
                </div>
                {item.revisado && item.defeito && (
                  <Textarea
                    value={item.observacao}
                    disabled={readOnly}
                    onChange={(e) => observacao(p.id, e.target.value)}
                    placeholder="Descreva onde está o defeito e como ele se apresenta..."
                    className="mt-3 min-h-16"
                  />
                )}
              </div>
            );
          })}

          <div className="space-y-2 pt-1">
            <label className="text-sm font-semibold">Observações gerais da vistoria</label>
            <Textarea
              value={observacoesGerais}
              disabled={readOnly}
              onChange={(e) => setObservacoesGerais(e.target.value)}
              placeholder="Ex.: cliente ciente das avarias apontadas antes do serviço."
            />
          </div>

          {!readOnly ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted p-3">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                {concluida ? <ShieldCheck size={16} className="text-primary" /> : <AlertTriangle size={16} className="text-primary" />}
                {concluida
                  ? "Todos os pontos foram revisados. A vistoria pode ser salva."
                  : "Revise todos os 8 pontos antes de salvar."}
              </p>
              <Button
                type="button"
                disabled={busy || !concluida}
                onClick={() => void onSave({ itens, observacoesGerais })}
              >
                <Save size={15} />
                Salvar vistoria
              </Button>
            </div>
          ) : (
            <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              Vistoria encerrada com a comanda. O histórico permanece somente para consulta.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
