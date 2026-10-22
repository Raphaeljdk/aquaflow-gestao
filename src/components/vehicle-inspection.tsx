"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, ClipboardCheck, Eye, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ItemVistoria, Vistoria, VistoriaItemId } from "@/types";

const pontos: Array<{ id: VistoriaItemId; label: string; detalhe: string; x: number; y: number }> = [
  { id: "PARACHOQUES", label: "Para-choques", detalhe: "Trincas, riscos ou peças soltas", x: 50, y: 9 },
  { id: "FAROIS", label: "Faróis e lanternas", detalhe: "Quebras, trincas ou infiltrações", x: 77, y: 20 },
  { id: "PINTURA", label: "Pintura e riscos", detalhe: "Marcas, manchas e descascados", x: 21, y: 34 },
  { id: "RETROVISORES", label: "Retrovisores", detalhe: "Quebras, folgas ou riscos", x: 80, y: 40 },
  { id: "VIDROS", label: "Vidros", detalhe: "Trincas, lascas e riscos", x: 50, y: 49 },
  { id: "AMASSADOS", label: "Lataria e amassados", detalhe: "Mossas e deformações", x: 20, y: 63 },
  { id: "RODAS_PNEUS", label: "Rodas e pneus", detalhe: "Cortes e danos aparentes", x: 78, y: 73 },
  { id: "INTERIOR", label: "Interior e objetos", detalhe: "Pertences e avarias internas", x: 50, y: 86 },
];

function checklist(value: Vistoria | null): ItemVistoria[] {
  return pontos.map((p) => {
    const saved = value?.itens?.find((item) => item.id === p.id);
    return saved
      ? { id: p.id, revisado: saved.revisado, defeito: saved.revisado && saved.defeito, observacao: saved.observacao ?? "" }
      : { id: p.id, revisado: false, defeito: false, observacao: "" };
  });
}

export function VehicleInspection({
  value,
  busy,
  tipo = "CARRO",
  readOnly = false,
  onSave,
}: {
  value: Vistoria | null;
  busy: boolean;
  tipo?: "CARRO" | "MOTO" | "CAMINHONETE";
  readOnly?: boolean;
  onSave: (vistoria: Omit<Vistoria, "atualizadoEm">) => Promise<boolean>;
}) {
  const [itens, setItens] = useState<ItemVistoria[]>(() => checklist(value));
  const [observacoesGerais, setObservacoesGerais] = useState(value?.observacoesGerais ?? "");
  const [selectedId, setSelectedId] = useState<VistoriaItemId>("PARACHOQUES");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [externalChange, setExternalChange] = useState(false);
  const lastVersion = useRef<string | null>(null);
  const dirtyRef = useRef(false);

  // The order detail is keyed by order ID, so switching orders remounts this form.
  // A snapshot refresh must never discard unsaved observations.
  useEffect(() => {
    const version = value?.atualizadoEm ?? "__nova__";
    if (lastVersion.current === version) return;
    if (lastVersion.current !== null && dirtyRef.current) {
      setExternalChange(true);
      return;
    }
    lastVersion.current = version;
    setItens(checklist(value));
    setObservacoesGerais(value?.observacoesGerais ?? "");
    setDirty(false);
    dirtyRef.current = false;
    setSaved(false);
    setExternalChange(false);
  }, [value?.atualizadoEm]);

  const revisados = itens.filter((i) => i.revisado).length;
  const defeitos = itens.filter((i) => i.revisado && i.defeito).length;
  const concluida = revisados === pontos.length;
  const faltantes = pontos.length - revisados;
  const byId = useMemo(() => new Map(itens.map((i) => [i.id, i])), [itens]);

  function changed() {
    dirtyRef.current = true;
    setDirty(true);
    setSaved(false);
    setError("");
  }

  function marcar(id: VistoriaItemId, estado: "ok" | "defeito" | "pendente") {
    if (readOnly || busy) return;
    setItens((current) => current.map((item) => item.id === id
      ? {
          ...item,
          revisado: estado !== "pendente",
          defeito: estado === "defeito",
          observacao: estado === "ok" ? "" : item.observacao,
        }
      : item));
    changed();
  }

  function escolher(id: VistoriaItemId) {
    setSelectedId(id);
    const target = document.getElementById("vistoria-" + id);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "instant" : "smooth" });
  }

  async function salvar() {
    if (!concluida || busy || readOnly) return;
    setError("");
    try {
      const ok = await onSave({ itens, observacoesGerais });
      if (!ok) { setError("Não foi possível salvar. Tente novamente."); return; }
      dirtyRef.current = false;
      setDirty(false);
      setSaved(true);
      setExternalChange(false);
      lastVersion.current = value?.atualizadoEm ?? "__nova__";
    } catch {
      setError("Falha de conexão ao salvar. Confira a comanda e tente novamente.");
    }
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-label="Vistoria de entrada">
      <div className="border-b border-border bg-[#111820] px-4 py-5 text-white sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-[#101820]">
              <ClipboardCheck size={22} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold tracking-tight sm:text-lg">Vistoria de entrada</h3>
              <p className="mt-1 max-w-md text-xs leading-5 text-white/70">
                Confira o estado do veículo antes da lavagem. Toque no desenho ou escolha um item da lista.
              </p>
            </div>
          </div>
          <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tabular-nums">
            {revisados} de {pontos.length} revisados
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"
          role="progressbar" aria-label="Progresso da vistoria" aria-valuemin={0} aria-valuemax={pontos.length} aria-valuenow={revisados}>
          <div className="h-full rounded-full bg-yellow-400 transition-[width] duration-200"
            style={{ width: (revisados / pontos.length * 100) + "%" }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-300"><CheckCircle2 size={14} /> {revisados - defeitos} sem avaria</span>
          <span className="flex items-center gap-1.5 text-yellow-300"><AlertTriangle size={14} /> {defeitos} com avaria</span>
          <span className="text-white/65">{faltantes} pendente{faltantes === 1 ? "" : "s"}</span>
        </div>
      </div>

      <div className="grid min-w-0 items-start gap-4 p-3 sm:p-5 md:grid-cols-[224px_minmax(0,1fr)]">
        <div className="min-w-0 rounded-2xl border border-slate-700/70 bg-[#17212b] p-4 md:sticky md:top-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/65">Mapa: {tipo === "MOTO" ? "moto" : tipo === "CAMINHONETE" ? "caminhonete" : "carro"}</span>
            <Eye size={15} className="text-yellow-300" aria-hidden="true" />
          </div>
          <div className="relative mx-auto h-[304px] w-[174px] max-w-full select-none">
            <svg viewBox="0 0 174 304" className="h-full w-full" role="img" aria-label={"Vista superior de " + (tipo === "MOTO" ? "uma moto" : "um carro") + " com oito pontos de vistoria"}>
              {tipo === "MOTO" ? (
                <g fill="none" strokeLinejoin="round">
                  <ellipse cx="87" cy="38" rx="20" ry="34" fill="#141e2a" stroke="#facc15" strokeWidth="2.5"/>
                  <ellipse cx="87" cy="266" rx="20" ry="34" fill="#141e2a" stroke="#facc15" strokeWidth="2.5"/>
                  <path d="M87 65 L87 236 M45 92 L129 92 M59 86 L49 111 M115 86 L125 111" stroke="#aab9ce" strokeWidth="9" strokeLinecap="round"/>
                  <path d="M70 104 L104 104 L117 172 L105 223 L69 223 L57 172 Z" fill="#223448" stroke="#facc15" strokeWidth="2"/>
                  <ellipse cx="87" cy="151" rx="31" ry="50" fill="#172535" stroke="#94a3b8" strokeWidth="2"/>
                  <path d="M65 165 L109 165 M69 191 L105 191" stroke="#facc15" strokeOpacity=".45" strokeWidth="3"/>
                  <path d="M62 205 L48 230 M112 205 L126 230" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round"/>
                  <ellipse cx="87" cy="112" rx="20" ry="13" fill="#34475e" stroke="#94a3b8"/>
                </g>
              ) : <>
              <defs>
                <linearGradient id="vehicle-inspection-body" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#374151" />
                  <stop offset="50%" stopColor="#1c2935" />
                  <stop offset="100%" stopColor="#0d1721" />
                </linearGradient>
              </defs>
              <rect x="38" y="13" width="98" height="278" rx="37" fill="url(#vehicle-inspection-body)" stroke="#facc15" strokeWidth="2.2" />
              <path d="M53 37 Q87 23 121 37 L125 66 Q87 75 49 66 Z" fill="#253341" stroke="#91a2b7" strokeWidth="1.4" />
              <path d="M49 78 Q87 73 125 78 L127 201 Q87 210 47 201 Z" fill="#111e29" stroke="#8194a8" strokeOpacity=".8" strokeWidth="1.6" />
              <path d="M55 88 Q87 79 119 88 L120 139 Q87 149 54 139 Z" fill="#33495a" stroke="#9aaabe" strokeOpacity=".7" />
              <path d="M54 151 Q87 161 120 151 L120 194 Q87 201 54 194 Z" fill="#243746" stroke="#7c92a8" strokeOpacity=".65" />
              <path d="M53 215 Q87 210 121 215 L121 263 Q87 274 53 263 Z" fill="#263542" stroke="#91a2b7" strokeWidth="1.4" />
              <path d="M51 44 L123 44 M50 252 L124 252" stroke="#ffffff" strokeOpacity=".12" />
              <rect x="23" y="74" width="15" height="45" rx="7" fill="#070e15" stroke="#67788b" strokeWidth="1.5" />
              <rect x="136" y="74" width="15" height="45" rx="7" fill="#070e15" stroke="#67788b" strokeWidth="1.5" />
              <rect x="23" y="200" width="15" height="45" rx="7" fill="#070e15" stroke="#67788b" strokeWidth="1.5" />
              <rect x="136" y="200" width="15" height="45" rx="7" fill="#070e15" stroke="#67788b" strokeWidth="1.5" />
              <path d="M38 112 L22 104 L22 94 L38 95 M136 95 L152 94 L152 104 L136 112" fill="#475569" stroke="#a3b3c6" />
              <path d="M58 19 H116 M57 284 H117" stroke="#fde047" strokeWidth="5" strokeLinecap="round" />
              <path d="M49 161 L39 161 M125 161 L135 161" stroke="#a3b3c6" strokeOpacity=".6" />
              <path d="M87 5 V13 M87 291 V299" stroke="#fde047" strokeOpacity=".75" strokeDasharray="2 2" />
              </>}
            </svg>
            {pontos.map((p, index) => {
              const item = byId.get(p.id);
              const status = !item?.revisado ? "pendente" : item.defeito ? "avaria" : "ok";
              const selected = selectedId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-label={p.label + ": " + (status === "avaria" ? "com avaria" : status === "ok" ? "sem avaria" : "pendente") + ". Abrir item."}
                  aria-pressed={selected}
                  title={p.label}
                  onClick={() => escolher(p.id)}
                  style={{ left: p.x + "%", top: p.y + "%" }}
                  className={"absolute flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow-lg transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white " +
                    (status === "avaria" ? "border-yellow-200 bg-yellow-400 text-slate-950"
                      : status === "ok" ? "border-emerald-200 bg-emerald-500 text-white"
                      : "border-slate-400 bg-[#1b2935] text-white") +
                    (selected ? " ring-2 ring-white ring-offset-2 ring-offset-[#17212b] scale-110" : "")}
                >
                  {status === "avaria" ? "!" : status === "ok" ? <Check size={16} /> : index + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-3 border-t border-white/10 pt-3 text-[11px] text-white/75">
            <span className="flex items-center gap-1"><i className="size-2.5 rounded-full bg-slate-400" /> Pendente</span>
            <span className="flex items-center gap-1"><i className="size-2.5 rounded-full bg-emerald-500" /> OK</span>
            <span className="flex items-center gap-1"><i className="size-2.5 rounded-full bg-yellow-400" /> Avaria</span>
          </div>
          <p className="mt-3 text-center text-[11px] leading-4 text-white/60">
            Os números mostram os pontos. Toque para localizar e avaliar cada item.
          </p>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-sm font-bold">Checklist do veículo</h4>
            <span className="text-xs text-muted-foreground">8 pontos</span>
          </div>
          {pontos.map((p, index) => {
            const item = byId.get(p.id)!;
            const selected = selectedId === p.id;
            const state = !item.revisado ? "Pendente" : item.defeito ? "Com avaria" : "Sem avaria";
            return (
              <div id={"vistoria-" + p.id} key={p.id}
                className={"min-w-0 scroll-mt-5 rounded-xl border p-3 transition-colors sm:p-4 " +
                  (selected ? "border-primary/70 bg-primary/5" : "border-border bg-background/50")}>
                <div className="flex min-w-0 items-start gap-3">
                  <span className={"flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold " +
                    (selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{p.label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{p.detalhe}</p>
                  </div>
                  <span className={"shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold " +
                    (!item.revisado ? "bg-muted text-muted-foreground"
                      : item.defeito ? "bg-yellow-400/15 text-yellow-600 dark:text-yellow-300"
                      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300")}>
                    {state}
                  </span>
                </div>
                {!readOnly && (
                  <div className="mt-3 flex flex-wrap gap-2 sm:ml-11">
                    <Button type="button" size="sm"
                      variant={item.revisado && !item.defeito ? "default" : "outline"}
                      aria-pressed={item.revisado && !item.defeito}
                      disabled={busy} onClick={() => { setSelectedId(p.id); marcar(p.id, "ok"); }}
                      className="min-h-10 flex-1 gap-1.5 px-3 sm:flex-none">
                      <Check size={15} /> Sem avaria
                    </Button>
                    <Button type="button" size="sm"
                      variant={item.revisado && item.defeito ? "default" : "outline"}
                      aria-pressed={item.revisado && item.defeito}
                      disabled={busy} onClick={() => { setSelectedId(p.id); marcar(p.id, "defeito"); }}
                      className="min-h-10 flex-1 gap-1.5 px-3 sm:flex-none">
                      <AlertTriangle size={15} /> Com avaria
                    </Button>
                    {item.revisado && (
                      <button type="button" aria-label={"Limpar avaliação de " + p.label}
                        disabled={busy} onClick={() => marcar(p.id, "pendente")}
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
                        title="Marcar como pendente">
                        <RotateCcw size={15} />
                      </button>
                    )}
                  </div>
                )}
                {item.revisado && item.defeito && (
                  <div className="mt-3 space-y-1.5 sm:ml-11">
                    <label htmlFor={"vistoria-obs-" + p.id} className="text-xs font-semibold">Descreva a avaria (opcional)</label>
                    <Textarea id={"vistoria-obs-" + p.id} maxLength={300} rows={2}
                      value={item.observacao}
                      disabled={readOnly || busy}
                      onChange={(event) => {
                        setItens((current) => current.map((x) => x.id === p.id ? { ...x, observacao: event.target.value } : x));
                        changed();
                      }}
                      placeholder="Ex.: risco na porta direita, próximo à maçaneta"
                      className="min-h-16 resize-y text-base" />
                    <p className="text-right text-[11px] text-muted-foreground">{item.observacao.length}/300</p>
                  </div>
                )}
              </div>
            );
          })}
          <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
            <label htmlFor="vistoria-obs-gerais" className="block text-sm font-semibold">Observações gerais</label>
            <Textarea id="vistoria-obs-gerais" maxLength={1000} rows={3}
              value={observacoesGerais} disabled={readOnly || busy}
              onChange={(event) => { setObservacoesGerais(event.target.value); changed(); }}
              placeholder="Ex.: objetos deixados no veículo, cuidados especiais ou orientações do cliente."
              className="min-h-20 resize-y text-base" />
            <p className="text-right text-[11px] text-muted-foreground">{observacoesGerais.length}/1000</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-border bg-muted/30 p-4 sm:p-5">
        {externalChange && (
          <p role="status" className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs">
            A vistoria foi atualizada em outra sessão. Seu preenchimento foi mantido para você revisar antes de salvar.
          </p>
        )}
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2 text-xs leading-5 text-muted-foreground" role="status" aria-live="polite">
            {readOnly
              ? <ShieldCheck size={17} className="mt-0.5 shrink-0 text-primary" />
              : concluida ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-500" />
                : <AlertTriangle size={17} className="mt-0.5 shrink-0 text-primary" />}
            <span>
              {readOnly ? "Vistoria encerrada. Registro disponível somente para consulta."
                : !concluida ? "Faltam " + faltantes + " ponto(s) para liberar o salvamento."
                : saved && !dirty ? "Vistoria salva com sucesso."
                : dirty ? "Pronta para salvar. Alterações ainda não registradas."
                : "Todos os pontos revisados. Nenhuma alteração pendente."}
            </span>
          </div>
          {!readOnly && (
            <Button type="button" disabled={busy || !concluida || !dirty}
              onClick={() => void salvar()} className="h-11 w-full shrink-0 gap-2 sm:w-auto sm:min-w-[165px]">
              <Save size={17} /> {busy ? "Salvando..." : dirty ? "Salvar vistoria" : "Vistoria salva"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
