"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, ClipboardCheck, Eye, RotateCcw, Save, ShieldCheck, Camera, X, Shield, CarFront, ImagePlus, Info } from "lucide-react";
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
  const [fotos, setFotos] = useState<string[]>(value?.fotos ?? []);
  const [uploading, setUploading] = useState(false);
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
    setFotos(value?.fotos ?? []);
    setDirty(false);
    dirtyRef.current = false;
    setSaved(false);
    setExternalChange(false);
  }, [value?.atualizadoEm]);

  const revisados = itens.filter((i) => i.revisado).length;
  const defeitos = itens.filter((i) => i.revisado && i.defeito).length;
  const concluida = revisados === pontos.length;
  const faltantes = pontos.length - revisados;
  const selected = pontos.find((p) => p.id === selectedId)!;
  const selectedItem = itens.find((i) => i.id === selectedId)!;
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
      const ok = await onSave({ itens, observacoesGerais, fotos });
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


  async function adicionarFoto(file?: File) {
    if (!file || busy || readOnly || uploading || fotos.length >= 3) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8_000_000) {
      setError("Escolha uma foto JPG, PNG ou WebP de até 8 MB.");
      return;
    }
    setUploading(true);
    try {
      const imagem = await createImageBitmap(file);
      const max = 960;
      const scale = Math.min(1, max / Math.max(imagem.width, imagem.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(imagem.width * scale));
      canvas.height = Math.max(1, Math.floor(imagem.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw Error("Não foi possível processar a foto.");
      context.drawImage(imagem, 0, 0, canvas.width, canvas.height);
      imagem.close();
      let arquivo = "";
      for (const quality of [0.73, 0.57, 0.42, 0.30]) {
        arquivo = canvas.toDataURL("image/jpeg", quality);
        if (arquivo.length <= 100000) break;
      }
      if (arquivo.length > 100000) throw Error("Foto muito detalhada. Escolha outra imagem.");
      setFotos(current => current.length < 3 ? [...current, arquivo] : current);
      changed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível adicionar a imagem.");
    } finally {
      setUploading(false);
    }
  }
  function marcarTodosOk() {
    if (readOnly || busy) return;
    if (itens.some(i => i.revisado && i.defeito) &&
      !window.confirm("Marcar tudo como OK também removerá as avarias já apontadas. Continuar?")) return;
    setItens(items => items.map(i => ({...i, revisado: true, defeito: false, observacao: ""})));
    changed();
  }
  function limparTudo() {
    if (readOnly || busy || !window.confirm("Limpar marcações desta vistoria? As fotos serão mantidas até você removê-las.")) return;
    setItens(checklist(null));
    changed();
  }
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[#334454] bg-[#101924] text-slate-100 shadow-sm" aria-label="Vistoria de entrada">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-500/10 text-cyan-300">
            <CarFront size={22} aria-hidden="true"/>
          </span>
          <div>
            <h3 className="text-base font-bold tracking-tight">Vistoria de avarias</h3>
            <p className="mt-0.5 text-xs text-slate-400">Inspeção visual do veículo · registro de entrada</p>
          </div>
        </div>
        <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200">
          {readOnly ? "Vistoria encerrada" : concluida ? "Revisão completa" : "Em andamento"}
        </div>
      </header>
      <div className="grid grid-cols-2 gap-2 border-b border-white/10 px-4 py-3 text-center sm:grid-cols-4 sm:px-5">
        {[
          {label:"Pontos revisados",value:revisados + " / 8",color:"text-slate-50"},
          {label:"Sem avaria",value:String(revisados-defeitos),color:"text-emerald-300"},
          {label:"Com avaria",value:String(defeitos),color:"text-amber-300"},
          {label:"Pendentes",value:String(faltantes),color:"text-slate-300"}
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-white/5 bg-white/[.035] px-2 py-2">
            <p className="text-[10px] text-slate-400">{k.label}</p>
            <p className={"mt-0.5 text-lg font-bold tabular-nums " + k.color}>{k.value}</p>
          </div>
        ))}
      </div>
      <div className="grid min-w-0 gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="min-w-0 space-y-3">
          <div className="rounded-xl border border-white/10 bg-[#182633] p-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2 font-semibold"><Eye size={15} className="text-cyan-300"/> Mapa de avarias</span>
              <span className="text-slate-400">{tipo === "MOTO" ? "Moto" : tipo === "CAMINHONETE" ? "Caminhonete" : "Carro"} · Vista superior</span>
            </div>
            <div className="relative mx-auto mt-2 h-[285px] w-[164px] max-w-full select-none">
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
                const estado = !item?.revisado ? "pendente" : item.defeito ? "avaria" : "ok";
                return (
                  <button key={p.id} type="button"
                    title={p.label}
                    aria-label={p.label + ": " + estado + ". Selecionar área"}
                    aria-pressed={selectedId===p.id}
                    onClick={() => escolher(p.id)}
                    style={{ left:p.x + "%", top:p.y + "%" }}
                    className={"absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 " +
                      (estado==="avaria"?"border-amber-200 bg-amber-400 text-slate-950":estado==="ok"?"border-emerald-200 bg-emerald-500 text-white":"border-slate-400 bg-[#1b2935] text-white") +
                      (selectedId===p.id?" ring-2 ring-cyan-300 ring-offset-2 ring-offset-[#182633]":"")}>
                    {estado==="avaria"?"!":estado==="ok"?<Check size={15}/>:index+1}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-3 border-t border-white/10 pt-3 text-[11px] text-slate-300">
              <span className="flex items-center gap-1"><i className="size-2.5 rounded-full bg-slate-400"/> Pendente</span>
              <span className="flex items-center gap-1"><i className="size-2.5 rounded-full bg-emerald-400"/> OK</span>
              <span className="flex items-center gap-1"><i className="size-2.5 rounded-full bg-amber-400"/> Avaria</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#182633] p-3">
            <p className="mb-2 text-xs font-semibold">Pontos de inspeção</p>
            <div className="grid grid-cols-2 gap-1.5">
              {pontos.map((p,index)=>{
                const item=byId.get(p.id);
                return <button id={"vistoria-"+p.id} key={p.id} type="button"
                  onClick={()=>escolher(p.id)} aria-pressed={selectedId===p.id}
                  className={"flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-2 text-left text-[11px] transition-colors " +
                    (selectedId===p.id?"border-cyan-300/60 bg-cyan-400/10":"border-white/10 bg-white/[.025]")}>
                    <span className={"flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold "+
                      (!item?.revisado?"bg-slate-700 text-slate-200":item.defeito?"bg-amber-400 text-slate-950":"bg-emerald-500 text-white")}>
                      {item?.revisado && !item.defeito?<Check size={11}/>:index+1}
                    </span>
                    <span className="truncate text-slate-200">{p.label}</span>
                  </button>;
              })}
            </div>
          </div>
        </div>
        <div className="min-w-0 space-y-3">
          <div className="rounded-xl border border-cyan-400/20 bg-[#182633] p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">Área selecionada</p>
                <h4 className="mt-1 text-sm font-bold">{selected.label}</h4>
                <p className="mt-1 text-xs text-slate-400">{selected.detalhe}</p>
              </div>
              <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-slate-300">
                {!selectedItem.revisado?"Pendente":selectedItem.defeito?"Com avaria":"Sem avaria"}
              </span>
            </div>
            {!readOnly && <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" type="button" disabled={busy}
                variant={selectedItem.revisado && !selectedItem.defeito?"default":"outline"}
                aria-pressed={selectedItem.revisado && !selectedItem.defeito}
                className="min-h-9 flex-1"
                onClick={()=>marcar(selected.id,"ok")}><Check size={14}/> Sem avaria</Button>
              <Button size="sm" type="button" disabled={busy}
                variant={selectedItem.revisado && selectedItem.defeito?"default":"outline"}
                aria-pressed={selectedItem.revisado && selectedItem.defeito}
                className="min-h-9 flex-1"
                onClick={()=>marcar(selected.id,"defeito")}><AlertTriangle size={14}/> Com avaria</Button>
              <Button size="icon" type="button" variant="outline" disabled={busy}
                aria-label={"Limpar avaliação de "+selected.label}
                onClick={()=>marcar(selected.id,"pendente")}><RotateCcw size={14}/></Button>
            </div>}
            {selectedItem.revisado && selectedItem.defeito && <div className="mt-3">
              <label htmlFor={"vistoria-obs-"+selected.id} className="text-xs text-slate-300">Detalhes da avaria</label>
              <Textarea id={"vistoria-obs-"+selected.id} maxLength={300} rows={2}
                value={selectedItem.observacao} disabled={readOnly||busy}
                onChange={(event)=>{setItens(current=>current.map(x=>x.id===selected.id?{...x,observacao:event.target.value}:x));changed();}}
                placeholder="Ex.: risco leve na porta direita" className="mt-1 min-h-16 border-white/15 bg-[#111d29] text-sm text-slate-50 placeholder:text-slate-500"/>
            </div>}
          </div>
          <div className="rounded-xl border border-white/10 bg-[#182633] p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-xs font-semibold"><Camera size={15} className="text-cyan-300"/> Fotos de apoio</p>
              <span className="text-[11px] text-slate-400">{fotos.length} / 3</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {fotos.map((foto,index)=><div key={index} className="relative aspect-square overflow-hidden rounded-lg border border-white/15">
                <img src={foto} alt={"Foto de vistoria "+(index+1)} className="size-full object-cover"/>
                {!readOnly && <button type="button" aria-label={"Remover foto "+(index+1)}
                  disabled={busy} className="absolute right-1 top-1 rounded-full bg-black/75 p-1 text-white"
                  onClick={()=>{setFotos(current=>current.filter((_,i)=>i!==index));changed();}}>
                  <X size={14}/>
                </button>}
              </div>)}
              {!readOnly && fotos.length < 3 && <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-cyan-400/35 bg-cyan-400/5 px-1 text-center text-[10px] text-cyan-200">
                <ImagePlus size={20}/><span>{uploading?"Preparando...":"Adicionar foto"}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                  disabled={busy||uploading}
                  onChange={e=>{void adicionarFoto(e.target.files?.[0]);e.currentTarget.value="";}}/>
              </label>}
            </div>
            <p className="mt-2 text-[10px] leading-4 text-slate-400">Até 3 fotos comprimidas, salvas junto da vistoria.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#182633] p-3 sm:p-4">
            <label htmlFor="vistoria-obs-gerais" className="block text-xs font-semibold">Observações gerais</label>
            <Textarea id="vistoria-obs-gerais" maxLength={1000} rows={2}
              value={observacoesGerais} disabled={readOnly||busy}
              onChange={e=>{setObservacoesGerais(e.target.value);changed();}}
              placeholder="Observações sobre o veículo ou objetos encontrados"
              className="mt-2 min-h-20 border-white/15 bg-[#111d29] text-sm text-slate-50 placeholder:text-slate-500"/>
          </div>
          {!readOnly && <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={busy||uploading}
              onClick={marcarTodosOk} className="flex-1"><ShieldCheck size={14}/> Marcar tudo OK</Button>
            <Button type="button" size="sm" variant="outline" disabled={busy||uploading}
              onClick={limparTudo}><RotateCcw size={14}/> Limpar</Button>
          </div>}
        </div>
      </div>
      <footer className="space-y-3 border-t border-white/10 bg-[#0c151e] px-4 py-4 sm:px-5">
        {externalChange && <p role="status" className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">A vistoria foi atualizada em outra sessão. As alterações ainda não salvas foram preservadas para revisão.</p>}
        {error && <p role="alert" className="rounded-lg border border-red-400/40 bg-red-400/10 p-3 text-xs text-red-200">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-start gap-2 text-xs text-slate-300" role="status" aria-live="polite">
            <Info size={16} className="shrink-0 text-cyan-300"/>
            <span>{readOnly?"Vistoria encerrada: somente consulta.":!concluida?"Revise os "+faltantes+" pontos restantes antes de salvar.":dirty?"Pronta para salvar. Alterações pendentes.":saved?"Vistoria salva.":"Todos os pontos revisados."}</span>
          </p>
          {!readOnly && <Button type="button" disabled={busy || !concluida || !dirty || uploading}
            onClick={()=>void salvar()} className="min-h-11 w-full gap-2 sm:w-auto">
            <Save size={16}/>{busy?"Salvando...":"Salvar vistoria"}
          </Button>}
        </div>
        <p className="text-[10px] text-slate-500">Mapa ilustrativo de inspeção · o registro de avarias é preservado no histórico da comanda.</p>
      </footer>
    </section>
  );
}
