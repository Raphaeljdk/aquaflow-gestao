"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Building2, Check, ExternalLink, Loader2, Plus, RefreshCw, Search, Pencil } from "lucide-react";
import { cnpjValido, type DadosPublicosCnpj } from "@/lib/cnpj-publico";

type FormValues = {
  nome: string; cidade: string; whatsapp: string; cnpj: string; razaoSocial: string;
  responsavel: string; endereco: string; cep: string; bairro: string; uf: string;
  email: string; telefoneComercial: string; situacaoCadastral: string;
  atividadePrincipal: string; naturezaJuridica: string; porte: string; dataAbertura: string;
};
type Parceiro = FormValues & {
  id: string; ativo: boolean; createdAt: string;
};
const empty: FormValues = {
  nome: "", cidade: "", whatsapp: "", cnpj: "", razaoSocial: "",
  responsavel: "", endereco: "", cep: "", bairro: "", uf: "",
  email: "", telefoneComercial: "", situacaoCadastral: "",
  atividadePrincipal: "", naturezaJuridica: "", porte: "", dataAbertura: "",
};
const inputClass =
  "h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

function formFromPartner(p: Parceiro): FormValues {
  return Object.fromEntries(Object.keys(empty).map(key => [key, p[key as keyof FormValues] ?? ""])) as unknown as FormValues;
}

/** Resposta pública oferece sugestões, nunca salva nem publica um parceiro automaticamente. */
export function preencherParceiroComCnpj(form: FormValues, data: DadosPublicosCnpj): FormValues {
  return {
    ...form,
    cnpj: data.cnpj,
    nome: data.nomeFantasia || data.razaoSocial || form.nome,
    razaoSocial: data.razaoSocial || form.razaoSocial,
    cidade: data.cidade || form.cidade,
    endereco: data.endereco || form.endereco,
    cep: data.cep || form.cep,
    bairro: data.bairro || form.bairro,
    uf: data.uf || form.uf,
    email: data.email || form.email,
    telefoneComercial: data.telefoneComercial || form.telefoneComercial,
    situacaoCadastral: data.situacao || form.situacaoCadastral,
    atividadePrincipal: data.atividadePrincipal || form.atividadePrincipal,
    naturezaJuridica: data.naturezaJuridica || form.naturezaJuridica,
    porte: data.porte || form.porte,
    dataAbertura: data.dataAbertura || form.dataAbertura,
    // WhatsApp e responsável são fornecidos/confirmados pelo proprietário,
    // nunca presumidos a partir de telefone fixo ou dados societários.
    whatsapp: form.whatsapp,
    responsavel: form.responsavel,
  };
}

type Field = {
  key: keyof FormValues; label: string; max: number; placeholder?: string; required?: boolean;
  type?: string; span?: boolean;
};
const fields: Field[] = [
  { key:"nome", label:"Nome de exibição do lava-rápido", max:120, required:true, placeholder:"Como aparecerá para os clientes" },
  { key:"razaoSocial", label:"Razão social", max:200, placeholder:"Nome empresarial registrado" },
  { key:"cidade", label:"Cidade / região", max:120, placeholder:"Ex.: Cotia, SP" },
  { key:"uf", label:"UF", max:2, placeholder:"SP" },
  { key:"endereco", label:"Endereço completo", max:300, span:true, placeholder:"Rua, número, complemento, bairro e CEP" },
  { key:"bairro", label:"Bairro", max:120 },
  { key:"cep", label:"CEP", max:9, placeholder:"00000-000" },
  { key:"email", label:"E-mail comercial", max:150, type:"email", placeholder:"contato@empresa.com.br" },
  { key:"telefoneComercial", label:"Telefone comercial", max:35, type:"tel", placeholder:"(11) 3333-3333" },
  { key:"whatsapp", label:"WhatsApp de agendamentos com DDD", max:35, type:"tel", required:true, placeholder:"(11) 99999-9999" },
  { key:"responsavel", label:"Nome do proprietário / responsável", max:120, placeholder:"Preencher manualmente" },
  { key:"situacaoCadastral", label:"Situação cadastral", max:50, placeholder:"ATIVA" },
  { key:"dataAbertura", label:"Data de abertura", max:10, placeholder:"AAAA-MM-DD" },
  { key:"atividadePrincipal", label:"CNAE / atividade principal", max:250, span:true },
  { key:"naturezaJuridica", label:"Natureza jurídica", max:150 },
  { key:"porte", label:"Porte da empresa", max:80 },
];

function PartnerFields({
  value, onChange, initialCnpj = "", disabled,
}: {
  value: FormValues; onChange: (next: FormValues) => void;
  initialCnpj?: string; disabled: boolean;
}) {
  const [looking, setLooking] = useState(false);
  const [lookupStatus, setLookupStatus] = useState("");
  const lastAuto = useRef(initialCnpj.replace(/\D/g, ""));
  const requestCounter = useRef(0);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const digits = value.cnpj.replace(/\D/g, "");
  const valid = cnpjValido(digits);

  const consultar = useCallback(async (cnpj: string, signal?: AbortSignal) => {
    const requestId = ++requestCounter.current;
    setLooking(true); setLookupStatus("");
    try {
      const res = await fetch("/api/public/cnpj/" + encodeURIComponent(cnpj), {
        signal, cache:"no-store",
      });
      const body = await res.json() as DadosPublicosCnpj & { error?: string };
      if (!res.ok) throw new Error(body.error || "Não foi possível consultar o CNPJ.");
      if (requestId !== requestCounter.current ||
          valueRef.current.cnpj.replace(/\D/g, "") !== cnpj) return;
      onChangeRef.current(preencherParceiroComCnpj(valueRef.current, body));
      setLookupStatus("Dados públicos encontrados e preenchidos. Revise e edite antes de salvar. Nenhum cadastro foi criado automaticamente.");
    } catch (e) {
      if (signal?.aborted) return;
      setLookupStatus((e instanceof Error ? e.message : "Falha na consulta.") +
        " Você pode preencher manualmente e salvar.");
    } finally {
      if (requestId === requestCounter.current) setLooking(false);
    }
  }, []);

  // Após digitar/colar um CNPJ válido, preenche automaticamente uma única vez.
  // Ao editar cadastro existente, não sobrescreve os valores já personalizados.
  useEffect(() => {
    if (!valid || digits === lastAuto.current || disabled) return;
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      lastAuto.current = digits;
      void consultar(digits, ac.signal);
    }, 650);
    return () => { window.clearTimeout(timer); ac.abort(); };
  }, [digits, valid, disabled, consultar]);

  const set = (key: keyof FormValues, text: string) => {
    onChange({ ...value, [key]: text });
    if (key === "cnpj") setLookupStatus("");
  };
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="font-semibold">Consulta do cartão CNPJ</h4>
            <p className="text-xs text-muted-foreground">Dados públicos de cadastro empresarial via BrasilAPI. Confira no cartão oficial da Receita Federal antes de aprovar.</p>
          </div>
          <a href="https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_S.aspx"
            target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline">
            Cartão oficial <ExternalLink size={13}/>
          </a>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 space-y-1 text-xs font-semibold">
            <span>CNPJ (opcional para cadastro manual)</span>
            <input name="cnpj" aria-label="CNPJ da empresa" inputMode="numeric"
              value={value.cnpj} maxLength={18} placeholder="00.000.000/0001-00"
              onChange={e=>set("cnpj",e.target.value)} className={inputClass} disabled={disabled} />
          </label>
          <button type="button" disabled={!valid || looking || disabled}
            onClick={() => { lastAuto.current = digits; void consultar(digits); }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold disabled:opacity-50">
            {looking ? <Loader2 size={16} className="animate-spin"/> : <Search size={16}/>}
            {looking ? "Consultando..." : "Consultar e preencher"}
          </button>
        </div>
        {!!digits && !valid && <p className="mt-2 text-xs text-amber-600">Confira o CNPJ. A consulta requer 14 dígitos válidos.</p>}
        {lookupStatus && <p role="status" className="mt-2 text-xs text-muted-foreground">{lookupStatus}</p>}
      </div>
      <div>
        <h4 className="mb-3 text-sm font-bold">Dados da empresa</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(field => (
            <label key={field.key} className={"min-w-0 space-y-1 text-xs font-semibold " + (field.span ? "sm:col-span-2" : "")}>
              <span>{field.label}{field.required ? " *" : ""}</span>
              <input
                name={field.key} type={field.type || "text"}
                value={value[field.key] || ""} maxLength={field.max}
                required={field.required} minLength={field.key === "nome" ? 3 : undefined}
                placeholder={field.placeholder} disabled={disabled}
                onChange={e=>set(field.key,e.target.value)} className={inputClass} />
            </label>
          ))}
        </div>
      </div>
      <p className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
        Todas as informações podem ser editadas. O WhatsApp precisa ser confirmado manualmente, pois o telefone cadastrado na Receita pode ser fixo.
      </p>
    </div>
  );
}

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
      const res = await fetch("/api/plataforma/parceiros", { cache:"no-store" });
      const body = await res.json() as { parceiros?: Parceiro[]; error?: string };
      if (!res.ok) throw new Error(body.error || "Não foi possível listar parceiros.");
      setParceiros(body.parceiros ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Falha de conexão."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function criar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy("new"); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/plataforma/parceiros", {
        method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(form),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error || "Não foi possível cadastrar.");
      setForm({...empty});
      setSuccess("Parceiro salvo com dados revisados. Permanece oculto até a ativação manual.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao cadastrar."); }
    finally { setBusy(null); }
  }
  async function atualizar(id: string, data: Partial<Parceiro>) {
    setBusy(id); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/plataforma/parceiros/" + encodeURIComponent(id), {
        method:"PATCH", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error || "Não foi possível atualizar.");
      setEditingId(null);
      setSuccess("Alterações gravadas. Outros parceiros permanecem intactos.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao salvar."); }
    finally { setBusy(null); }
  }

  return (
    <section className="space-y-6" aria-label="Gerenciar lava-rápidos parceiros">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Lava-rápidos parceiros</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Consulte o CNPJ, revise as informações e personalize cada parceiro.
            O cadastro de parceiro não provisiona banco operacional nem libera acesso ao ERP.
          </p>
        </div>
        <a href="/agendar" target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
          <ExternalLink size={16}/> Ver página pública
        </a>
      </div>
      <form onSubmit={event => void criar(event)} className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 font-bold"><Plus size={18} className="text-primary"/> Adicionar parceiro</h3>
        <PartnerFields value={form} onChange={setForm} disabled={!!busy}/>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">O parceiro não aparecerá para os clientes até você ativá-lo.</p>
          <button type="submit" disabled={!!busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {busy === "new" ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>} Cadastrar parceiro
          </button>
        </div>
      </form>
      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
      {success && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
        <Check size={17}/>{success}
      </p>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{parceiros.filter(p=>p.ativo).length} ativo(s) · {parceiros.length} cadastrado(s)</p>
        <button type="button" onClick={() => void load()} disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50">
          <RefreshCw size={14}/> Atualizar
        </button>
      </div>
      {loading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin"/> Carregando parceiros...</p>}
      {!loading && !parceiros.length && <p className="rounded-2xl border border-dashed border-border p-6 text-sm">
        Nenhum parceiro cadastrado. Use o formulário acima.
      </p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {parceiros.map(p => (
          <article key={p.id} className="min-w-0 space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="break-words font-bold">{p.nome}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{p.cidade || "Cidade não informada"}</p>
                {p.razaoSocial && <p className="mt-1 break-words text-xs text-muted-foreground">{p.razaoSocial}</p>}
              </div>
              <span className={"rounded-full px-3 py-1 text-xs font-semibold " +
                (p.ativo ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                {p.ativo ? "Visível ao público" : "Oculto"}
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <p><strong>WhatsApp:</strong> {p.whatsapp}</p>
              {p.cnpj && <p><strong>CNPJ:</strong> {p.cnpj}</p>}
              {p.email && <p className="break-all"><strong>E-mail:</strong> {p.email}</p>}
              {p.endereco && <p className="break-words"><strong>Endereço:</strong> {p.endereco}</p>}
              {p.situacaoCadastral && <p><strong>Situação:</strong> {p.situacaoCadastral}</p>}
            </div>
            {editingId === p.id && (
              <form onSubmit={event => { event.preventDefault(); void atualizar(p.id, editForm); }}
                className="space-y-3 rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
                <PartnerFields value={editForm} onChange={setEditForm}
                  initialCnpj={p.cnpj} disabled={busy===p.id}/>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={!!busy} className="min-h-10 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
                    {busy===p.id ? "Salvando..." : "Salvar alterações"}
                  </button>
                  <button type="button" onClick={()=>setEditingId(null)} className="min-h-10 rounded-lg border border-border px-4 py-2 text-xs font-semibold">Cancelar</button>
                </div>
              </form>
            )}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <button type="button" disabled={!!busy}
                onClick={() => { setEditingId(p.id); setEditForm(formFromPartner(p)); }}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50">
                <Pencil size={14}/> Editar dados
              </button>
              <button type="button" disabled={!!busy}
                onClick={() => {
                  if (!p.ativo && !window.confirm("Confirma a parceria e o WhatsApp? Este lava-rápido aparecerá na página pública.")) return;
                  void atualizar(p.id, { ativo: !p.ativo });
                }}
                className={"min-h-10 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 " +
                  (p.ativo ? "border border-destructive/30 text-destructive" : "bg-primary text-primary-foreground")}>
                {busy===p.id ? "Salvando..." : p.ativo ? "Ocultar parceiro" : "Ativar agendamentos"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
