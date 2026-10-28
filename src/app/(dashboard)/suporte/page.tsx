"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LifeBuoy, Send, RefreshCw, Loader2, MessageSquare, CheckCircle2, AlertCircle, Clock3, Plus } from "lucide-react";
import { DEMO, useStore } from "@/hooks/use-store";
import { categoriaChamadoLabels, statusChamadoLabels } from "@/lib/chamados";

type Categoria = keyof typeof categoriaChamadoLabels;
type Status = keyof typeof statusChamadoLabels;
type Mensagem = { id: string; autorTipo: "SOLICITANTE"|"SUPORTE"; autorNome: string; texto: string; createdAt: string };
type Chamado = {
  id: string; empresaNome: string; titulo: string; categoria: Categoria;
  prioridade: "NORMAL"|"ALTA"; status: Status; criadoPorNome: string;
  createdAt: string; updatedAt: string; mensagens: Mensagem[];
};
const panel = "rounded-2xl border border-border bg-card p-4 sm:p-5";
const field = "min-h-11 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function SuportePage() {
  const { user, data } = useStore();
  const [items,setItems] = useState<Chamado[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [creating,setCreating] = useState(false);
  const [busy,setBusy] = useState(false);
  const [titulo,setTitulo] = useState("");
  const [categoria,setCategoria] = useState<Categoria>("ERRO");
  const [prioridade,setPrioridade] = useState<"NORMAL"|"ALTA">("NORMAL");
  const [descricao,setDescricao] = useState("");
  const [selected,setSelected] = useState<string|null>(null);
  const [resposta,setResposta] = useState("");

  const load = useCallback(async () => {
    if (DEMO) {setLoading(false);return;}
    setLoading(true);
    try {
      const r=await fetch("/api/chamados",{cache:"no-store"});
      const body=await r.json() as {chamados?:Chamado[];error?:string};
      if(!r.ok)throw new Error(body.error||"Não foi possível carregar os chamados.");
      setItems(body.chamados??[]);
    } catch (e) {setError(e instanceof Error?e.message:"Falha de conexão.");}
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);

  async function abrir(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();if(busy||DEMO)return;
    setBusy(true);setError("");setNotice("");
    try{
      const r=await fetch("/api/chamados",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({titulo,categoria,prioridade,descricao})});
      const body=await r.json() as {chamado?:{id:string};error?:string};
      if(!r.ok)throw new Error(body.error||"Não foi possível abrir o chamado.");
      setTitulo("");setCategoria("ERRO");setPrioridade("NORMAL");setDescricao("");
      setCreating(false);setSelected(body.chamado?.id??null);
      setNotice("Chamado enviado para a gestão da plataforma. Você pode acompanhar o atendimento nesta página.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao enviar chamado.");}
    finally{setBusy(false);}
  }
  async function responder(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();if(!selected||busy||DEMO)return;
    setBusy(true);setError("");setNotice("");
    try{
      const r=await fetch("/api/chamados/"+encodeURIComponent(selected)+"/mensagens",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({texto:resposta}),
      });
      const body=await r.json() as {error?:string};
      if(!r.ok)throw new Error(body.error||"Não foi possível responder.");
      setResposta("");setNotice("Sua mensagem foi enviada para a gestão da plataforma.");await load();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao responder.");}
    finally{setBusy(false);}
  }
  const chosen=items.find(x=>x.id===selected);
  return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><LifeBuoy size={16}/> Central de suporte</p>
        <h1 className="text-3xl font-black tracking-tight">Suporte e chamados</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Precisa de ajuda com o ERP? Abra um chamado para a gestão da plataforma e acompanhe a resposta.
        </p>
      </div>
      <button type="button" onClick={()=>{setCreating(v=>!v);setSelected(null);setError("");setNotice("");}}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">
        <Plus size={17}/> {creating?"Fechar formulário":"Abrir chamado"}
      </button>
    </header>

    {DEMO&&<p className="rounded-xl border border-border bg-muted p-4 text-sm">Abertura de chamados indisponível no modo demonstração. Entre com um login real.</p>}
    {error&&<p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle size={17} className="shrink-0"/>{error}</p>}
    {notice&&<p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm"><CheckCircle2 size={17} className="shrink-0 text-emerald-500"/>{notice}</p>}

    {creating && <form onSubmit={e=>void abrir(e)} className={panel+" space-y-5"}>
      <div><h2 className="text-lg font-bold">Novo chamado</h2>
        <p className="mt-1 text-xs text-muted-foreground">Estabelecimento: {data?.configuracao.nome??"Lava-rápido"} · Solicitante: {user?.name??"Usuário"}</p></div>
      <label className="block space-y-2 text-sm font-semibold">Assunto do chamado
        <input required minLength={6} maxLength={120} value={titulo} onChange={e=>setTitulo(e.target.value)} className={field}
          placeholder="Ex.: Não consigo concluir uma comanda" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 text-sm font-semibold">Categoria
          <select className={field} value={categoria} onChange={e=>setCategoria(e.target.value as Categoria)}>
            {Object.entries(categoriaChamadoLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="block space-y-2 text-sm font-semibold">Prioridade
          <select className={field} value={prioridade} onChange={e=>setPrioridade(e.target.value as "NORMAL"|"ALTA")}>
            <option value="NORMAL">Normal</option><option value="ALTA">Alta — impede a operação</option>
          </select>
        </label>
      </div>
      <label className="block space-y-2 text-sm font-semibold">Descreva o que aconteceu
        <textarea required rows={5} minLength={15} maxLength={2500} value={descricao}
          onChange={e=>setDescricao(e.target.value)}
          className={field+" min-h-[140px] resize-y"} placeholder="Informe qual aba apresentou problema, os passos realizados e a mensagem de erro, se houver."/>
        <span className="block text-right text-xs font-normal text-muted-foreground">{descricao.length}/2500</span>
      </label>
      <p className="text-xs leading-5 text-muted-foreground">Não envie senhas, tokens ou dados financeiros sensíveis. O chamado é encaminhado para a gestão da plataforma.</p>
      <button type="submit" disabled={busy||DEMO} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50 sm:w-auto">
        {busy?<Loader2 size={16} className="animate-spin"/>:<Send size={16}/>} {busy?"Enviando...":"Enviar chamado"}
      </button>
    </form>}

    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-lg font-bold">Acompanhar chamados</h2>
          <p className="text-xs text-muted-foreground">{items.length} chamado(s) encontrado(s)</p></div>
        <button onClick={()=>void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold disabled:opacity-50">
          <RefreshCw size={15} className={loading?"animate-spin":""}/> Atualizar
        </button>
      </div>
      {loading&&<p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin"/> Carregando chamados...</p>}
      {!loading&&!items.length&&<div className={panel+" py-12 text-center"}>
        <MessageSquare size={27} className="mx-auto mb-3 text-muted-foreground"/>
        <p className="font-semibold">Nenhum chamado registrado</p>
        <p className="mt-1 text-sm text-muted-foreground">Para solicitar suporte, use o botão “Abrir chamado”.</p>
      </div>}
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(250px,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-2">{items.map(item=><button type="button" key={item.id}
          onClick={()=>{setSelected(item.id);setCreating(false);setResposta("");}}
          className={"w-full min-w-0 space-y-2 rounded-xl border p-4 text-left transition hover:bg-muted/50 "+(selected===item.id?"border-primary bg-primary/5":"border-border bg-card")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="break-words text-sm font-bold">{item.titulo}</span>
            <span className={"rounded-full px-2 py-1 text-[11px] font-semibold "+(item.status==="ABERTO"?"bg-yellow-500/15 text-yellow-600 dark:text-yellow-300":"bg-muted text-muted-foreground")}>{statusChamadoLabels[item.status]}</span>
          </div>
          <p className="text-xs text-muted-foreground">{categoriaChamadoLabels[item.categoria]} · {new Date(item.createdAt).toLocaleDateString("pt-BR")}</p>
          {item.prioridade==="ALTA"&&<p className="text-xs font-semibold text-amber-600 dark:text-amber-300">Prioridade alta</p>}
        </button>)}</div>
        {chosen && <article className={panel+" min-w-0 space-y-4"}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div><h3 className="break-words text-lg font-bold">{chosen.titulo}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{categoriaChamadoLabels[chosen.categoria]} · {chosen.empresaNome}</p></div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold"><Clock3 size={14}/>{statusChamadoLabels[chosen.status]}</span>
          </div>
          <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
            {chosen.mensagens.map(msg=><div key={msg.id} className={"rounded-xl border p-3 "+(msg.autorTipo==="SUPORTE"?"border-primary/30 bg-primary/5":"border-border bg-muted/30")}>
              <div className="flex flex-wrap justify-between gap-2 text-xs font-bold"><span>{msg.autorTipo==="SUPORTE"?"Gestão da plataforma":msg.autorNome}</span>
                <span className="font-normal text-muted-foreground">{new Date(msg.createdAt).toLocaleString("pt-BR")}</span></div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{msg.texto}</p>
            </div>)}
          </div>
          {chosen.status!=="FECHADO" ? <form onSubmit={e=>void responder(e)} className="space-y-3 border-t border-border pt-4">
            <label htmlFor="resposta-chamado" className="text-sm font-semibold">Responder ao suporte</label>
            <textarea id="resposta-chamado" required minLength={2} maxLength={2500} rows={3} className={field+" min-h-[95px]"}
              placeholder="Adicione mais informações ou responda às orientações..." value={resposta} onChange={e=>setResposta(e.target.value)}/>
            <button type="submit" disabled={busy||DEMO} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50">
              {busy?<Loader2 size={15} className="animate-spin"/>:<Send size={15}/>} Enviar mensagem
            </button>
          </form> : <p className="rounded-lg bg-muted p-3 text-xs">Chamado encerrado. Para outro assunto, abra um novo.</p>}
        </article>}
      </div>
    </section>
  </main>;
}
