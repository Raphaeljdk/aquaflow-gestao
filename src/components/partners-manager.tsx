"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Building2, Check, ExternalLink, Loader2, Plus, RefreshCw } from "lucide-react";
type Parceiro = { id: string; nome: string; responsavel: string; cidade: string; endereco: string; cnpj: string; email: string; whatsapp: string; ativo: boolean; createdAt: string };
type FormValues = { nome: string; responsavel: string; cidade: string; endereco: string; cnpj: string; email: string; whatsapp: string };
const empty: FormValues = { nome: "", responsavel: "", cidade: "", endereco: "", cnpj: "", email: "", whatsapp: "" };

export function PartnersManager() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [form, setForm] = useState<FormValues>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormValues>(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/plataforma/parceiros", { cache: "no-store" });
      const body = await res.json() as { parceiros?: Parceiro[]; error?: string };
      if (!res.ok) throw new Error(body.error || "Não foi possível listar parceiros.");
      setParceiros(body.parceiros ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Falha de conexão."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function criar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy("new"); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/plataforma/parceiros", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error || "Não foi possível cadastrar.");
      setForm(empty); setSuccess("Parceiro cadastrado, mas ainda oculto. Ative-o após validar a parceria e o WhatsApp.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao salvar."); }
    finally { setBusy(null); }
  }
  async function atualizar(id: string, data: Partial<Parceiro>) {
    setBusy(id); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/plataforma/parceiros/" + encodeURIComponent(id), {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error || "Não foi possível atualizar.");
      setEditingId(null);
      setSuccess("Parceiro atualizado com sucesso.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao salvar."); }
    finally { setBusy(null); }
  }
  const update = (key: keyof FormValues, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const inputClass = "h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <section className="space-y-6" aria-label="Gerenciar lava-rápidos parceiros">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Lava-rápidos parceiros</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Cadastre somente estabelecimentos com parceria confirmada. Novos registros ficam ocultos até a ativação manual; aprovar uma solicitação comercial não divulga o estabelecimento.
          </p>
        </div>
        <a href="/agendar" target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
          <ExternalLink size={16} /> Ver página pública
        </a>
      </div>
      <form onSubmit={(event) => void criar(event)} className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 font-bold"><Plus size={18} className="text-primary" /> Adicionar parceiro</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm font-semibold">
            <span>Nome do lava-rápido</span>
            <input required minLength={3} maxLength={120} value={form.nome} onChange={e=>update("nome",e.target.value)}
              placeholder="Nome do estabelecimento" className={inputClass} />
          </label>
          <label className="space-y-2 text-sm font-semibold">
            <span>Cidade / região (opcional)</span>
            <input maxLength={120} value={form.cidade} onChange={e=>update("cidade",e.target.value)}
              placeholder="Ex.: Itapevi, SP" className={inputClass} />
          </label>
          <label className="space-y-2 text-sm font-semibold">
            <span>WhatsApp com DDD</span>
            <input required type="tel" maxLength={35} value={form.whatsapp} onChange={e=>update("whatsapp",e.target.value)}
              placeholder="(11) 99999-9999" className={inputClass} />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold">
            <span>Responsável / proprietário</span>
            <input maxLength={120} value={form.responsavel} onChange={e=>update("responsavel",e.target.value)}
              placeholder="Nome do proprietário" className={inputClass} />
          </label>
          <label className="space-y-2 text-sm font-semibold">
            <span>CNPJ (opcional)</span>
            <input inputMode="numeric" maxLength={18} value={form.cnpj} onChange={e=>update("cnpj",e.target.value)}
              placeholder="00.000.000/0001-00" className={inputClass} />
          </label>
          <label className="space-y-2 text-sm font-semibold">
            <span>E-mail do responsável</span>
            <input type="email" maxLength={150} value={form.email} onChange={e=>update("email",e.target.value)}
              placeholder="contato@empresa.com.br" className={inputClass} />
          </label>
          <label className="space-y-2 text-sm font-semibold">
            <span>Endereço completo</span>
            <input maxLength={240} value={form.endereco} onChange={e=>update("endereco",e.target.value)}
              placeholder="Rua, número, bairro e cidade" className={inputClass} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">O novo parceiro não aparecerá para os clientes até você ativá-lo.</p>
          <button type="submit" disabled={!!busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {busy === "new" ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Cadastrar parceiro
          </button>
        </div>
      </form>
      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
      {success && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm"><Check size={17} /> {success}</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{parceiros.filter(p=>p.ativo).length} ativo(s) · {parceiros.length} cadastrado(s)</p>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>
      {loading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Carregando parceiros...</p>}
      {!loading && !parceiros.length && <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <Building2 size={25} className="mx-auto mb-2 text-muted-foreground" />
        <p className="font-semibold">Nenhum parceiro cadastrado</p>
        <p className="mt-1 text-sm text-muted-foreground">Use o formulário acima para adicionar o primeiro estabelecimento aprovado.</p>
      </div>}
      <div className="grid gap-4 lg:grid-cols-2">
        {parceiros.map(p => (
          <article key={p.id} className="min-w-0 space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0"><h3 className="break-words font-bold">{p.nome}</h3><p className="mt-1 text-xs text-muted-foreground">{p.cidade || "Cidade não informada"}</p></div>
              <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (p.ativo ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                {p.ativo ? "Visível ao público" : "Oculto"}
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <p>WhatsApp: <span className="font-semibold">{p.whatsapp}</span></p>
              {p.responsavel && <p>Proprietário: <span className="font-semibold">{p.responsavel}</span></p>}
              {p.cnpj && <p>CNPJ: {p.cnpj}</p>}
              {p.endereco && <p className="break-words">Endereço: {p.endereco}</p>}
              {p.email && <p className="break-all">E-mail: <a className="underline" href={"mailto:"+p.email}>{p.email}</a></p>}
            </div>
            {editingId === p.id && (
              <form onSubmit={event => { event.preventDefault(); void atualizar(p.id, editForm); }} className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
                <label className="block space-y-1 text-xs font-semibold">Nome
                  <input required minLength={3} maxLength={120} className={inputClass} value={editForm.nome}
                    onChange={e=>setEditForm(v=>({...v,nome:e.target.value}))} />
                </label>
                <label className="block space-y-1 text-xs font-semibold">Cidade
                  <input maxLength={120} className={inputClass} value={editForm.cidade}
                    onChange={e=>setEditForm(v=>({...v,cidade:e.target.value}))} />
                </label>
                <label className="block space-y-1 text-xs font-semibold">WhatsApp
                  <input required type="tel" maxLength={35} className={inputClass} value={editForm.whatsapp}
                    onChange={e=>setEditForm(v=>({...v,whatsapp:e.target.value}))} />
                </label>
                <label className="block space-y-1 text-xs font-semibold">Proprietário
                  <input maxLength={120} className={inputClass} value={editForm.responsavel}
                    onChange={e=>setEditForm(v=>({...v,responsavel:e.target.value}))} />
                </label>
                <label className="block space-y-1 text-xs font-semibold">CNPJ
                  <input inputMode="numeric" maxLength={18} className={inputClass} value={editForm.cnpj}
                    onChange={e=>setEditForm(v=>({...v,cnpj:e.target.value}))} />
                </label>
                <label className="block space-y-1 text-xs font-semibold">E-mail
                  <input type="email" maxLength={150} className={inputClass} value={editForm.email}
                    onChange={e=>setEditForm(v=>({...v,email:e.target.value}))} />
                </label>
                <label className="block space-y-1 text-xs font-semibold">Endereço
                  <input maxLength={240} className={inputClass} value={editForm.endereco}
                    onChange={e=>setEditForm(v=>({...v,endereco:e.target.value}))} />
                </label>
                <div className="flex gap-2">
                  <button disabled={busy===p.id} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Salvar</button>
                  <button type="button" onClick={()=>setEditingId(null)} className="rounded-lg border border-border px-4 py-2 text-xs font-semibold">Cancelar</button>
                </div>
              </form>
            )}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <button type="button" disabled={!!busy} onClick={() => { setEditingId(p.id); setEditForm({nome:p.nome,responsavel:p.responsavel,cidade:p.cidade,endereco:p.endereco,cnpj:p.cnpj,email:p.email,whatsapp:p.whatsapp}); }}
                className="min-h-10 rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50">Editar dados</button>
              <button type="button" disabled={!!busy}
                onClick={() => {
                  if (!p.ativo && !window.confirm("Confirma a parceria e o WhatsApp? Este lava-rápido aparecerá na página pública.")) return;
                  void atualizar(p.id, { ativo: !p.ativo });
                }}
                className={"min-h-10 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 " +
                  (p.ativo ? "border border-destructive/30 text-destructive" : "bg-primary text-primary-foreground")}>
                {busy === p.id ? "Salvando..." : p.ativo ? "Ocultar parceiro" : "Ativar agendamentos"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
