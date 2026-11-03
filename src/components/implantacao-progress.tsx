"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,CheckCircle2,Clock3,Database,Loader2,Mail,RefreshCw,ShieldCheck,TriangleAlert} from "lucide-react";

type Progress={name:string;trial:boolean;tenantId:string|null;state:string;jobState:string|null;
 hasDatabase:boolean;invitationQueued:boolean;invitationSent:boolean;invitationFailed:boolean;canRecover?:boolean};
export function ImplantacaoProgress({requestId,autoStart}:{requestId:string;autoStart:boolean}){
 const [status,setStatus]=useState<Progress|null>(null);
 const [loading,setLoading]=useState(true),[starting,setStarting]=useState(false),[recovering,setRecovering]=useState(false);
 const [error,setError]=useState("");
 const started=useRef(false);
 const endpoint="/api/plataforma/solicitacoes/"+encodeURIComponent(requestId)+"/preparar";
 const refresh=useCallback(async()=>{
  const response=await fetch(endpoint,{cache:"no-store"});
  const body=await response.json() as Progress & {error?:string};
  if(!response.ok)throw new Error(body.error||"Não foi possível consultar a implantação.");
  setStatus(body);return body;
 },[endpoint]);
 const begin=useCallback(async()=>{
  setStarting(true);setError("");
  try{
   const response=await fetch(endpoint,{method:"POST"});
   const body=await response.json() as Progress & {error?:string};
   if(!response.ok)throw new Error(body.error||"Não foi possível iniciar a preparação.");
   setStatus(body);
  }catch(e){setError(e instanceof Error?e.message:"Falha na implantação.");try{await refresh()}catch{}}
  finally{setStarting(false)}
 },[endpoint,refresh]);
 const recover=useCallback(async()=>{
   if(!window.confirm("Reenviar um novo link seguro ao e-mail cadastrado? O link anterior será invalidado. Nenhum banco será recriado."))return;
   setRecovering(true);setError("");
   try{
     const response=await fetch("/api/plataforma/solicitacoes/"+encodeURIComponent(requestId)+"/recuperar-convite",{method:"POST"});
     const body=await response.json() as {error?:string;queued?:boolean};
     if(!response.ok||!body.queued)throw new Error(body.error||"Não foi possível recuperar o convite.");
     await refresh();
   }catch(e){setError(e instanceof Error?e.message:"Falha ao recuperar convite.");}
   finally{setRecovering(false)}
 },[requestId,refresh]);
 useEffect(()=>{
  let mounted=true;
  void refresh().catch(e=>{if(mounted)setError(e instanceof Error?e.message:"Falha ao carregar.")})
    .finally(()=>{if(mounted)setLoading(false)});
  if(autoStart&&!started.current){started.current=true;void begin();}
  const handle=setInterval(()=>{void refresh().catch(()=>{})},10000);
  return()=>{mounted=false;clearInterval(handle)};
 },[autoStart,begin,refresh]);
 const state=status?.state??"NOT_STARTED";
 const ready=state==="READY"&&status?.hasDatabase;
 const failed=state==="ERROR"||status?.jobState==="ERROR";
 const steps=[
  {label:"Cadastro recebido",description:"Dados da empresa registrados na plataforma.",done:true,icon:ShieldCheck},
  {label:"Banco exclusivo",description:failed?"Revisão manual necessária. Não repetir a criação do banco.":ready?"Banco Neon exclusivo preparado e validado.":state==="PROVISIONING"?"O banco individual está em preparação.":"Aguardando início do provisionamento.",done:!!ready,icon:Database},
  {label:"Convite por e-mail",description:status?.invitationSent?"Convite entregue ao provedor de e-mail.":status?.invitationFailed?"O Resend não confirmou o envio. Verifique o remetente e o domínio antes de tentar novamente.":status?.invitationQueued?"Convite na fila de envio pelo Resend.":status?.trial?"Enviado após preparar o banco exclusivo.":"Disponível após a confirmação do pagamento Stripe.",done:!!status?.invitationSent,icon:Mail}
 ];
 return <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-8">
  <section className="mx-auto max-w-4xl space-y-5">
   <Link href="/plataforma" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16}/> Voltar à gestão</Link>
   <header className="rounded-3xl border border-border bg-card p-6 sm:p-8">
    <p className="text-xs font-bold uppercase tracking-widest text-primary">Ducha Elitte · Implantação de empresa</p>
    <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{status?.name||"Preparar lava-rápido"}</h1>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Acompanhe a criação do banco de dados individual e a ativação do proprietário. Esta etapa não realiza cobrança.</p>
    {error&&<p role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><TriangleAlert size={16} className="mr-2 inline"/>{error}</p>}
    {loading?<p className="mt-7 inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin"/> Carregando o andamento...</p>:
     <div className="mt-6 space-y-3">{steps.map((step,i)=><div key={step.label} className="flex items-start gap-4 rounded-2xl border border-border bg-background p-4">
      <span className={"flex size-10 shrink-0 items-center justify-center rounded-xl "+(step.done?"bg-primary/15 text-primary":"bg-muted text-muted-foreground")}>
       {step.done?<CheckCircle2 size={20}/>:<step.icon size={20}/>}</span>
      <div><p className="font-semibold">{i+1}. {step.label}</p><p className="mt-1 text-sm text-muted-foreground">{step.description}</p></div>
     </div>)}</div>}
    <div className="mt-6 flex flex-wrap gap-3">
     <button type="button" onClick={()=>void refresh().catch(e=>setError(e instanceof Error?e.message:"Falha ao atualizar."))}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold"><RefreshCw size={16}/> Atualizar andamento</button>
     {(state==="NOT_STARTED"||state==="PENDING")&&!loading&&
      <button type="button" disabled={starting} onClick={()=>void begin()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
       {starting?<Loader2 size={17} className="animate-spin"/>:<Database size={17}/>} {starting?"Preparando...":"Preparar banco"} <ArrowRight size={16}/></button>}
     {ready&&status?.canRecover&&<button type="button" disabled={recovering} onClick={()=>void recover()}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/50 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50">
      {recovering?<Loader2 size={16} className="animate-spin"/>:<Mail size={16}/>}
      {recovering?"Solicitando reenvio...":"Recuperar convite por e-mail"}</button>}
     {state==="PROVISIONING"&&<span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Clock3 size={16}/> {starting?"Processando":"Provisionamento em andamento"}</span>}
     {ready&&<span className="self-center text-sm font-semibold text-primary">Banco exclusivo pronto</span>}
     {failed&&<span className="self-center text-sm font-semibold text-destructive">Revisão manual necessária</span>}
    </div>
   </header>
  </section>
 </main>;
}