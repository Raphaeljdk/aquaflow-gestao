"use client";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { LifeBuoy, Clock3, Loader2, RefreshCw, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { categoriaChamadoLabels, statusChamadoLabels } from "@/lib/chamados";
type Status = keyof typeof statusChamadoLabels;
type Categoria = keyof typeof categoriaChamadoLabels;
type Mensagem = {id:string; autorTipo:"SUPORTE"|"SOLICITANTE";autorNome:string;texto:string;createdAt:string};
type Ticket = {
  id:string; titulo:string; empresaNome:string;empresaCnpj:string;
  criadoPorNome:string;criadoPorEmail:string;categoria:Categoria;
  prioridade:"NORMAL"|"ALTA";status:Status;createdAt:string;updatedAt:string;
  mensagens:Mensagem[];
};
const field="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
export function PlatformTickets() {
  const [items,setItems]=useState<Ticket[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("TODOS");
  const [selected,setSelected]=useState<string|null>(null);
  const [answer,setAnswer]=useState("");
  const [status,setStatus]=useState<Status>("EM_ATENDIMENTO");
  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const r=await fetch("/api/plataforma/chamados",{cache:"no-store"});
      const body=await r.json() as {chamados?:Ticket[];error?:string};
      if(!r.ok)throw new Error(body.error||"Não foi possível consultar chamados.");
      setItems(body.chamados??[]);
    }catch(e){setError(e instanceof Error?e.message:"Erro ao consultar chamados.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  const filtered=useMemo(()=>items.filter(item=>
    (filter==="TODOS"||item.status===filter)&&
    [item.titulo,item.empresaNome,item.criadoPorNome,item.criadoPorEmail,item.id].some(value=>value.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")))
  ),[items,filter,search]);
  const current=items.find(i=>i.id===selected);
  async function update(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!selected||busy||(!answer.trim()&&status===current?.status))return;
    setBusy(true);setError("");setNotice("");
    try {
      const r=await fetch("/api/plataforma/chamados/"+encodeURIComponent(selected),{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({status,resposta:answer.trim()||undefined}),
      });
      const body=await r.json() as {error?:string};
      if(!r.ok)throw new Error(body.error||"Não foi possível atualizar chamado.");
      setAnswer("");setNotice("Chamado atualizado. A resposta já está disponível ao solicitante.");await load();
    }catch(e){setError(e instanceof Error?e.message:"Erro ao responder.");}
    finally{setBusy(false);}
  }
  return <section className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-2xl font-bold"><LifeBuoy size={23} className="text-primary"/> Chamados de suporte</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Solicitações dos usuários desta instância. Veja o histórico, responda e organize a fila de atendimento.</p></div>
      <button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold disabled:opacity-50">
        <RefreshCw size={16} className={loading?"animate-spin":""}/> Atualizar
      </button>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        ["Novos",items.filter(x=>x.status==="ABERTO").length],
        ["Em atendimento",items.filter(x=>x.status==="EM_ATENDIMENTO"||x.status==="AGUARDANDO_CLIENTE").length],
        ["Total de chamados",items.length],
      ].map(([label,value])=><div key={label} className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p>
      </div>)}
    </div>
    {notice&&<p role="status" className="flex gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm"><CheckCircle2 size={17} className="text-emerald-500"/>{notice}</p>}
    {error&&<p role="alert" className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle size={17}/>{error}</p>}
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
      <input value={search} onChange={e=>setSearch(e.target.value)} className={field} placeholder="Buscar empresa, assunto ou solicitante" aria-label="Buscar chamados"/>
      <select value={filter} onChange={e=>setFilter(e.target.value)} className={field} aria-label="Filtrar por status">
        <option value="TODOS">Todos os status</option>
        {Object.entries(statusChamadoLabels).map(([key,label])=><option value={key} key={key}>{label}</option>)}
      </select>
    </div>
    {loading&&<p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={17} className="animate-spin"/> Carregando...</p>}
    {!loading&&filtered.length===0&&<p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Nenhum chamado encontrado.</p>}
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(250px,0.85fr)_minmax(0,1.15fr)]">
      <div className="space-y-2">{filtered.map(item=><button key={item.id} type="button"
        onClick={()=>{setSelected(item.id);setStatus(item.status);setAnswer("");setNotice("");}}
        className={"w-full space-y-2 rounded-xl border p-4 text-left hover:bg-muted/40 "+(selected===item.id?"border-primary bg-primary/5":"border-border bg-card")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="break-words text-sm font-bold">{item.titulo}</span>
          <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-semibold">{statusChamadoLabels[item.status]}</span>
        </div>
        <p className="break-words text-xs text-muted-foreground">{item.empresaNome} · {item.criadoPorNome}</p>
        <p className="text-xs text-muted-foreground">{categoriaChamadoLabels[item.categoria]} · {new Date(item.createdAt).toLocaleDateString("pt-BR")}
          {item.prioridade==="ALTA"&&<span className="ml-2 font-semibold text-amber-600 dark:text-amber-300">Prioridade alta</span>}</p>
      </button>)}</div>
      {current&&<article className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <header className="border-b border-border pb-4">
          <h3 className="break-words text-lg font-bold">{current.titulo}</h3>
          <p className="mt-2 text-sm">{current.empresaNome}{current.empresaCnpj&&" · CNPJ: "+current.empresaCnpj}</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">{current.criadoPorNome} · {current.criadoPorEmail}</p>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 size={14}/>{new Date(current.createdAt).toLocaleString("pt-BR")}</p>
        </header>
        <div className="max-h-[430px] space-y-3 overflow-y-auto">
          {current.mensagens.map(msg=><div key={msg.id} className={"rounded-xl border p-3 "+(msg.autorTipo==="SUPORTE"?"border-primary/40 bg-primary/5":"border-border bg-muted/30")}>
            <div className="flex flex-wrap justify-between gap-2 text-xs"><strong>{msg.autorTipo==="SUPORTE"?"Gestão da plataforma":msg.autorNome}</strong>
              <span className="text-muted-foreground">{new Date(msg.createdAt).toLocaleString("pt-BR")}</span></div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{msg.texto}</p>
          </div>)}
        </div>
        <form onSubmit={e=>void update(e)} className="space-y-3 border-t border-border pt-4">
          <label className="block space-y-2 text-sm font-semibold">Status
            <select value={status} onChange={e=>setStatus(e.target.value as Status)} className={field}>
              {Object.entries(statusChamadoLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className="block space-y-2 text-sm font-semibold">Resposta ao solicitante (opcional)
            <textarea rows={4} maxLength={2500} value={answer} onChange={e=>setAnswer(e.target.value)}
              className={field+" min-h-[100px] resize-y"} placeholder="Escreva orientações, atualizações ou peça mais informações."/>
            <span className="block text-right text-xs font-normal text-muted-foreground">{answer.length}/2500</span>
          </label>
          <button type="submit" disabled={busy||(!answer.trim()&&status===current.status)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {busy?<Loader2 size={16} className="animate-spin"/>:<Send size={16}/>} Salvar e atualizar chamado
          </button>
          <p className="text-xs leading-5 text-muted-foreground">A resposta ficará disponível em Suporte / Chamados para o usuário. Não é enviado e-mail nem notificação externa automaticamente.</p>
        </form>
      </article>}
    </div>
  </section>;
}
