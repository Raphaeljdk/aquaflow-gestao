"use client";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Loader2, MessageCircle, RefreshCw, XCircle } from "lucide-react";
import { useStore, DEMO } from "@/hooks/use-store";
import { dateLabel } from "@/lib/format";

type Pedido={
  id:string;nome:string;telefone:string;tipo:"CARRO"|"MOTO"|"CAMINHONETE";
  placa:string;descricaoVeiculo:string;servicoId:string;dataHora:string;
  observacoes:string;status:"PENDENTE"|"CONFIRMADO"|"RECUSADO";
  agendamentoId:string|null;createdAt:string;
};
export function PublicBookingRequests(){
  const {data,refresh}=useStore();
  const [pedidos,setPedidos]=useState<Pedido[]>([]);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const load=useCallback(async()=>{
    if(DEMO)return;
    setLoading(true);setError("");
    try{
      const response=await fetch("/api/pedidos-agendamento",{cache:"no-store"});
      const result=await response.json() as {pedidos?:Pedido[];error?:string};
      if(!response.ok)throw new Error(result.error||"Falha ao buscar pedidos públicos.");
      setPedidos(result.pedidos??[]);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao carregar pedidos.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  async function responder(id:string,acao:"CONFIRMAR"|"RECUSAR"){
    if(busy)return;
    if(acao==="CONFIRMAR"&&!window.confirm("Confirmar o pedido e criar o agendamento? Confira placa, cliente, serviço e horário."))return;
    if(acao==="RECUSAR"&&!window.confirm("Recusar este pedido? O cliente precisará ser avisado pela equipe."))return;
    setBusy(id);setError("");setMessage("");
    try{
      const response=await fetch("/api/pedidos-agendamento/"+encodeURIComponent(id),{
        method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({acao}),
      });
      const result=await response.json() as {status?:string;error?:string};
      if(!response.ok)throw new Error(result.error||"Não foi possível atualizar o pedido.");
      setMessage(acao==="CONFIRMAR"
        ?"Agendamento confirmado e salvo na agenda. Avise o cliente."
        :"Pedido recusado. Avise o cliente pelo WhatsApp.");
      await Promise.all([load(),refresh()]);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao atualizar o pedido.");}
    finally{setBusy(null);}
  }
  const pendentes=pedidos.filter(p=>p.status==="PENDENTE");
  if(DEMO)return null;
  return <section className="panel mb-5 min-w-0 space-y-4 p-4 sm:p-5" aria-label="Pedidos de agendamento online">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 font-bold"><CalendarDays size={18} className="text-primary"/> Pedidos recebidos pelo link</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
          Solicitações feitas na página do seu lava-rápido. Confirme a disponibilidade antes de aceitar; o cliente deve ser avisado pela equipe.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary/15 px-3 py-1.5 text-xs font-bold">{pendentes.length} pendente(s)</span>
        <button type="button" disabled={loading} onClick={()=>void load()} className="flex size-9 items-center justify-center rounded-lg border border-border disabled:opacity-50"
          title="Atualizar pedidos" aria-label="Atualizar pedidos">
          <RefreshCw size={16} className={loading?"animate-spin":""}/>
        </button>
      </div>
    </div>
    {error&&<p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}
    {message&&<p role="status" className="flex gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs"><CheckCircle2 size={16}/>{message}</p>}
    {loading&&!pedidos.length&&<p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={15} className="animate-spin"/> Carregando pedidos...</p>}
    {!loading&&!pendentes.length&&<p className="rounded-xl bg-muted/40 px-4 py-5 text-sm text-muted-foreground">Nenhum pedido online aguardando confirmação.</p>}
    <div className="grid gap-3 lg:grid-cols-2">
      {pendentes.map(p=>{
        const service=data?.servicos.find(s=>s.id===p.servicoId);
        const msg="Olá, "+p.nome+"! Sobre sua solicitação de lavagem em "+dateLabel(p.dataHora,"dd/MM/yyyy 'às' HH:mm")+
          " para o veículo "+p.placa+": ";
        const numero=p.telefone.replace(/\D/g,"");
        return <article key={p.id} className="min-w-0 space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="break-words font-bold">{p.nome}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{p.tipo==="MOTO"?"Moto":p.tipo==="CAMINHONETE"?"Caminhonete":"Carro"} · {p.placa} · {p.descricaoVeiculo}</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
              <Clock3 size={13}/> Pendente
            </span>
          </div>
          <p className="text-sm font-semibold">{dateLabel(p.dataHora,"EEEE, dd/MM/yyyy 'às' HH:mm")}</p>
          <p className="text-xs text-muted-foreground">Serviço: {service?.nome??"Serviço não encontrado"} · WhatsApp: {p.telefone}</p>
          {p.observacoes&&<p className="rounded-lg bg-muted p-3 text-xs">{p.observacoes}</p>}
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <button type="button" disabled={!!busy} onClick={()=>void responder(p.id,"CONFIRMAR")}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
              <CheckCircle2 size={15}/> Confirmar na agenda
            </button>
            <button type="button" disabled={!!busy} onClick={()=>void responder(p.id,"RECUSAR")}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-50">
              <XCircle size={15}/> Recusar
            </button>
            <a href={"https://wa.me/"+numero+"?text="+encodeURIComponent(msg)} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold">
              <MessageCircle size={15}/> Conversar
            </a>
          </div>
        </article>;
      })}
    </div>
  </section>;
}
