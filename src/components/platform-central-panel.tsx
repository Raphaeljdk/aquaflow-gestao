"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {
  Activity,AlertCircle,ArrowRight,Building2,CheckCircle2,Clock3,Database,
  ExternalLink,Filter,Loader2,Mail,RefreshCw,Search,ShieldCheck,Users,ChevronDown,
  KeyRound,ServerCrash,ClipboardList
} from "lucide-react";

type Tenant={
 id:string;name:string;email:string;slug:string;state:string;createdAt:string;
 dbReady:boolean;license:string|null;trialEndsAt:string|null;
 ownerActive:boolean;members:number;jobState:string|null;jobAttempts:number|null;
 inviteStatus:string|null;inviteAt:string|null;signupType:string|null;legacyLinked:boolean;
};
type Account={
 id:string;name:string;email:string;role:string;enabled:boolean;tenantId:string|null;
 tenantName:string|null;tenantState:string|null;license:string|null;source:"TENANT"|"PLATFORM";
};
type Event={tenantId:string;action:string;createdAt:string};
type Result={tenants:Tenant[];accounts:Account[];events:Event[]};
type FilterValue="all"|"attention"|"provisioning"|"ready"|"active";

const date=(value:string|null)=>value?
 new Date(value).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"Não registrado";
const eventLabels:Record<string,string>={
 saas_signup_requested:"Cadastro público recebido",
 qa_provisioning_approved:"Implantação autorizada",
 owner_invitation_queued:"Convite colocado na fila",
 owner_invite_recovery_requested:"Recuperação de convite solicitada",
 owner_email_verified_provisioning_queued:"E-mail confirmado; banco em preparação",
 owner_invite_activated:"Proprietário ativou o acesso",
 self_service_trial_started_after_db_ready:"Teste de 7 dias iniciado",
 trial_activated_qa:"Teste ativado pelo gestor",
 notification_send_failed:"Falha no envio de notificação",
 tenant_provisioning_failed:"Provisionamento exige revisão",
};
function stage(t:Tenant){
 if(t.state==="ERROR"||t.jobState==="ERROR")return {label:"Revisão técnica",tone:"danger" as const};
 if(t.inviteStatus==="ERROR" && !t.ownerActive)return {label:"Falha no convite",tone:"danger" as const};
 if(t.state==="PROVISIONING")return {label:t.dbReady?"Migração em andamento":"Preparando banco",tone:"warning" as const};
 if(t.state==="PENDING")return {label:"Cadastro recebido",tone:"neutral" as const};
 if(t.state==="READY" && !t.dbReady)return {label:"Banco não validado",tone:"danger" as const};
 if(t.state==="READY" && !t.ownerActive)return {label:t.inviteStatus==="SENT"?"Aguardando primeira senha":t.inviteStatus==="PENDING"?"Convite em envio":"Aguardando convite",tone:"warning" as const};
 if(t.state==="READY" && ["TRIAL","ACTIVE","GRACE"].includes(t.license??""))return {label:"Acesso liberado",tone:"success" as const};
 if(t.state==="READY")return {label:"Aguardando licença",tone:"warning" as const};
 return {label:"Em análise",tone:"neutral" as const};
}
const stageStyle={
 success:"border-emerald-600/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
 warning:"border-amber-600/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
 danger:"border-red-600/25 bg-red-500/10 text-red-600 dark:text-red-400",
 neutral:"border-border bg-muted/70 text-muted-foreground",
};
function Status({value}:{value:ReturnType<typeof stage>}){
 return <span className={"inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold "+stageStyle[value.tone]}>{value.label}</span>;
}
function Empty({title,detail}:{title:string;detail:string}){
 return <div className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
  <ClipboardList className="text-muted-foreground" size={25}/>
  <p className="font-semibold">{title}</p><p className="max-w-lg text-sm text-muted-foreground">{detail}</p>
 </div>;
}
export function CentralPlatformPanel({mode,refreshKey=0}:{mode:"companies"|"accounts";refreshKey?:number}){
 const [data,setData]=useState<Result|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [updating,setUpdating]=useState(false);
 const [search,setSearch]=useState("");
 const [filter,setFilter]=useState<FilterValue>("all");
 const [selected,setSelected]=useState<string|null>(null);
 const [lastRefresh,setLastRefresh]=useState<Date|null>(null);
 const load=useCallback(async()=>{
   setUpdating(true);setError("");
   try{
    const response=await fetch("/api/plataforma/saas/central",{cache:"no-store"});
    const body=await response.json() as Result & {error?:string};
    if(!response.ok)throw new Error(body.error??"Não foi possível consultar o controle central.");
    setData({tenants:body.tenants??[],accounts:body.accounts??[],events:body.events??[]});
    setLastRefresh(new Date());
   }catch(e){setError(e instanceof Error?e.message:"Falha ao atualizar o banco central.");}
   finally{setUpdating(false);setLoading(false);}
 },[]);
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),60000);return ()=>clearInterval(timer);},[load,refreshKey]);
 const normalized=search.trim().toLocaleLowerCase("pt-BR");
 const tenants=useMemo(()=>data?.tenants??[],[data]);
 const accounts=useMemo(()=>data?.accounts??[],[data]);
 const shown=useMemo(()=>tenants.filter(t=>{
  const match=!normalized||[t.name,t.email,t.slug,t.signupType].some(v=>v?.toLocaleLowerCase("pt-BR").includes(normalized));
  const st=stage(t);
  const attention=st.tone==="danger"||(t.state==="PROVISIONING"&&t.jobState==="ERROR");
  const category=filter==="all"||filter==="attention"&&attention||filter==="provisioning"&&["PENDING","PROVISIONING"].includes(t.state)||
    filter==="ready"&&t.dbReady||filter==="active"&&st.label==="Acesso liberado";
  return match&&category;
 }),[tenants,normalized,filter]);
 const members=useMemo(()=>accounts.filter(a=>!normalized||[a.name,a.email,a.tenantName??"",a.role].some(v=>v.toLocaleLowerCase("pt-BR").includes(normalized))),[accounts,normalized]);
 const statusCounts={total:tenants.length,ready:tenants.filter(t=>t.dbReady).length,
  live:tenants.filter(t=>stage(t).label==="Acesso liberado").length,
  action:tenants.filter(t=>stage(t).tone==="danger").length};
 return <section className="space-y-5" aria-label={mode==="companies"?"Empresas do controle central":"Acessos do controle central"}>
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div>
    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
     <Database size={14}/> Banco central SaaS
    </p>
    <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">{mode==="companies"?"Empresas e implantações":"Proprietários e acessos multiempresa"}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{mode==="companies"?
     "Cadastros do Neon central, incluindo empresas que ainda não têm usuário ativo.":
     "Identidades do controle central, separadas dos colaboradores do ERP antigo."}</p>
   </div>
   <button type="button" onClick={()=>void load()} disabled={updating}
     className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold disabled:opacity-50">
     <RefreshCw size={15} className={updating?"animate-spin":""}/> Atualizar dados
   </button>
  </div>
  {mode==="companies"&&<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   {[
    {label:"Empresas cadastradas",value:statusCounts.total,icon:Building2},
    {label:"Bancos preparados",value:statusCounts.ready,icon:Database},
    {label:"Acessos liberados",value:statusCounts.live,icon:CheckCircle2},
    {label:"Precisam de revisão",value:statusCounts.action,icon:AlertCircle}
   ].map(({label,value,icon:Icon})=><div key={label} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
    <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{label}</span><Icon size={17} className="text-muted-foreground"/></div>
    <p className="mt-3 text-3xl font-black tabular-nums">{loading?"—":value}</p>
   </div>)}
  </div>}
  <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
   <label className="relative flex-1">
    <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
    <span className="sr-only">Buscar {mode==="companies"?"empresas":"usuários"}</span>
    <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
     placeholder={mode==="companies"?"Buscar empresa, e-mail ou código...":"Buscar usuário, e-mail ou empresa..."}
     className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"/>
   </label>
   {mode==="companies"&&<label className="relative flex items-center gap-2">
    <Filter className="text-muted-foreground" size={17}/>
    <span className="sr-only">Filtrar situação</span>
    <select value={filter} onChange={e=>setFilter(e.target.value as FilterValue)}
     className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm sm:w-auto">
     <option value="all">Todas as situações</option>
     <option value="attention">Exigem revisão</option>
     <option value="provisioning">Em implantação</option>
     <option value="ready">Banco preparado</option>
     <option value="active">Acesso liberado</option>
    </select>
   </label>}
  </div>
  {error&&<div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
   <div className="flex items-center gap-2 font-bold"><ServerCrash size={17}/> Não foi possível sincronizar o Neon central</div>
   <p className="mt-1">Os acessos do ERP antigo permanecem disponíveis. {error}</p>
  </div>}
  {loading?<p className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin"/> Consultando empresas e permissões...</p>:
   !data? <Empty title="Dados temporariamente indisponíveis" detail="Tente atualizar; não confunda uma falha de conexão com uma lista de empresas vazia."/>:
   mode==="companies" ? (
    shown.length===0?<Empty title="Nenhuma empresa neste filtro" detail={tenants.length?"Limpe a busca ou selecione outra situação.":"O controle central ainda não contém empresas cadastradas."}/>:
    <div className="space-y-3">
     {shown.map(t=>{
      const s=stage(t),open=selected===t.id;
      const timeline=(data.events??[]).filter(e=>e.tenantId===t.id).slice(0,8);
      return <article key={t.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
       <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
         <div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-base font-bold sm:text-lg">{t.name}</h3><Status value={s}/></div>
         <p className="mt-1 break-all text-sm text-muted-foreground">{t.email}</p>
         <p className="mt-1 text-xs text-muted-foreground">Código: <span className="font-mono">{t.slug}</span> · Cadastro: {date(t.createdAt)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:min-w-[310px]">
         <div className="rounded-xl bg-muted/60 px-3 py-2"><span className="block text-muted-foreground">Banco</span><strong className="mt-1 block">{t.dbReady?"Preparado":"Pendente"}</strong></div>
         <div className="rounded-xl bg-muted/60 px-3 py-2"><span className="block text-muted-foreground">Proprietário</span><strong className="mt-1 block">{t.ownerActive?"Ativo":"Sem acesso"}</strong></div>
         <div className="col-span-2 rounded-xl bg-muted/60 px-3 py-2 sm:col-span-1"><span className="block text-muted-foreground">Plano</span><strong className="mt-1 block">{t.license??"Pendente"}</strong></div>
        </div>
        <button type="button" onClick={()=>setSelected(open?null:t.id)} aria-expanded={open}
         className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted lg:self-auto">
         {open?"Ocultar detalhes":"Ver implantação"}<ChevronDown size={16} className={open?"rotate-180":""}/>
        </button>
       </div>
       {open&&<div className="space-y-5 border-t border-border bg-muted/20 p-4 sm:p-5">
        <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
         {[
          ["Estado da empresa",t.state],["Trabalho Neon",t.jobState??"Sem trabalho"],["Tentativas do worker",String(t.jobAttempts??0)],
          ["Último convite",t.inviteStatus??"Não enviado"],["Tipo de cadastro",t.signupType==="TESTE_7_DIAS"?"Teste gratuito":t.signupType==="CONTRATACAO"?"Contratação":t.signupType??"Anterior"],["Usuários ativos",String(t.members)],
          ["Fim do teste",date(t.trialEndsAt)],["Último envio",date(t.inviteAt)]
         ].map(([label,value])=><div key={label} className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words font-semibold">{value}</p></div>)}
        </div>
        <div>
         <h4 className="mb-3 flex items-center gap-2 text-sm font-bold"><Activity size={16}/> Histórico da implantação</h4>
         {timeline.length?<ol className="space-y-2">{timeline.map((e,i)=>
          <li key={e.createdAt+e.action+i} className="flex items-start gap-3 text-sm">
           <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"/>
           <span className="flex-1">{eventLabels[e.action]??e.action}</span>
           <span className="shrink-0 text-xs text-muted-foreground">{date(e.createdAt)}</span>
          </li>)}</ol>:<p className="text-sm text-muted-foreground">Ainda não há eventos registrados no histórico.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
         <ShieldCheck size={17}/>
         <span>Operação somente leitura: esta tela não recria bancos, não altera senhas e não dispara cobranças.</span>
         <a href={"mailto:"+t.email} className="ml-auto inline-flex items-center gap-1 font-semibold text-foreground underline underline-offset-4"><Mail size={14}/> Contatar proprietário</a>
        </div>
       </div>}
      </article>;
     })}
    </div>
   ) : (
    members.length===0?<Empty title="Nenhum acesso encontrado" detail={accounts.length?"Tente outra busca.":"Ainda não existem identidades ativadas no controle central. Os cadastros pendentes estão na aba Empresas."}/>:
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
     <table className="w-full min-w-[650px] text-left text-sm">
      <thead className="bg-muted/70 text-xs text-muted-foreground"><tr>
       <th className="p-4">Usuário</th><th className="p-4">Empresa</th><th className="p-4">Perfil</th><th className="p-4">Situação</th>
      </tr></thead>
      <tbody>{members.map(a=><tr key={a.id+":"+a.tenantId} className="border-t border-border">
       <td className="p-4"><p className="font-semibold">{a.name}</p><p className="mt-1 break-all text-xs text-muted-foreground">{a.email}</p></td>
       <td className="p-4">{a.source==="PLATFORM"?"Gestão central":a.tenantName??"Não associado"}</td>
       <td className="p-4">{a.role==="OWNER"?"Proprietário":a.role==="PLATFORM"?"Administrador central":a.role}</td>
       <td className="p-4"><span className={"inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold "+(a.enabled?"border-emerald-600/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400":"border-border bg-muted text-muted-foreground")}>{a.enabled?"Ativo":"Desativado"}</span></td>
      </tr>)}</tbody>
     </table>
    </div>
   )}
  {data&&<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
   <span><ShieldCheck size={14} className="mr-1 inline"/> Consulta protegida por administrador · dados separados por empresa</span>
   <span>{lastRefresh?"Atualizado às "+lastRefresh.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"Aguardando atualização"} · atualização automática a cada 60 segundos</span>
  </div>}
 </section>;
}
