"use client";
import {useCallback,useEffect,useState} from "react";
import {
  Activity,AlertCircle,Building2,CheckCircle2,Database,
  Filter,Loader2,Mail,RefreshCw,Search,ShieldCheck,ChevronDown,
  ServerCrash,ClipboardList,Archive,ShieldAlert,CreditCard
} from "lucide-react";

type Tenant={
 id:string;name:string;email:string;slug:string;state:string;createdAt:string;isArchived:boolean;
 dbReady:boolean;license:string|null;trialEndsAt:string|null;
 ownerActive:boolean;members:number;jobState:string|null;jobAttempts:number|null;
 inviteStatus:string|null;inviteAt:string|null;signupType:string|null;
};
type Account={
 id:string;name:string;email:string;role:string;enabled:boolean;tenantId:string|null;
 tenantName:string|null;tenantState:string|null;license:string|null;source:"TENANT"|"PLATFORM"|"PENDING";
};
type Event={tenantId:string;action:string;createdAt:string};
type Result={tenants:Tenant[];accounts:Account[];events:Event[];page:number;pageSize:number;totalMatched:number;counts:{total:number;ready:number;live:number;action:number;archived:number};adminOnboardingEnabled:boolean;billingReadiness:{liveConfigurationReady:boolean;pixFlagEnabled:boolean;blockers:string[];checksStillRequired:string[]}};
type FilterValue="all"|"attention"|"provisioning"|"ready"|"active"|"archived";

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
 tenant_archived:"Cadastro não aprovado arquivado pelo administrador",
};
function stage(t:Tenant){
 if(t.isArchived)return {label:"Arquivado",tone:"neutral" as const};
 if(t.state==="SUSPENDED")return {label:"Suspenso",tone:"warning" as const};
 const overdue=Date.now()-new Date(t.createdAt).getTime()>45*60*1000;
 if(t.state==="PROVISIONING"&&!t.dbReady&&t.jobState==="PENDING"&&(t.jobAttempts??0)===0&&overdue)
  return {label:"Provisionamento parado",tone:"danger" as const};
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
 const [page,setPage]=useState(1);
 const [selected,setSelected]=useState<string|null>(null);
 const [lastRefresh,setLastRefresh]=useState<Date|null>(null);
 const [busyTenant,setBusyTenant]=useState<string|null>(null);
 const [actionMessage,setActionMessage]=useState("");
 const load=useCallback(async()=>{
   setUpdating(true);setError("");
   try{
    const query=new URLSearchParams({mode,search:search.trim(),filter,page:String(page)});
    const response=await fetch("/api/plataforma/saas/central?"+query.toString(),{cache:"no-store"});
    const body=await response.json() as Result & {error?:string};
    if(!response.ok)throw new Error(body.error??"Não foi possível consultar o controle central.");
    setData(body);
    setLastRefresh(new Date());
   }catch(e){setError(e instanceof Error?e.message:"Falha ao atualizar o banco central.");}
   finally{setUpdating(false);setLoading(false);}
 },[mode,search,filter,page]);
 useEffect(()=>{const timer=setTimeout(()=>void load(),250);return ()=>clearTimeout(timer);},[load,refreshKey]);
 useEffect(()=>{const timer=setInterval(()=>void load(),60000);return ()=>clearInterval(timer);},[load]);
 async function activate(t:Tenant,action:"send-invite"|"prepare-db"){
  const explanation=action==="send-invite"?
   "Enviar um link único de criação de senha ao proprietário? Isso não cria banco nem cobra o cliente.":
   "O proprietário já confirmou o e-mail? Preparar o banco individual agora pode criar um novo projeto Neon; não repita a ação em caso de falha.";
  if(!window.confirm(explanation))return;
  setBusyTenant(t.id);setActionMessage("");setError("");
  try{
   const response=await fetch("/api/plataforma/saas/tenants/"+encodeURIComponent(t.id)+"/ativar",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action})
   });
   const body=await response.json() as {error?:string;detail?:string};
   if(!response.ok)throw new Error(body.error??"Falha na ativação deste cadastro.");
   setActionMessage(body.detail??"Ação registrada; atualize a implantação.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível concluir.");}
  finally{setBusyTenant(null);}
 }
 async function archive(t:Tenant){
  if(!window.confirm("Arquivar este cadastro não aprovado? A empresa desaparecerá da lista principal, mas os identificadores serão mantidos para impedir outro teste. Bancos e contas existentes não serão excluídos."))return;
  setBusyTenant(t.id);setError("");setActionMessage("");
  try{
   const response=await fetch("/api/plataforma/saas/tenants/"+encodeURIComponent(t.id)+"/arquivar",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({confirmation:"ARQUIVAR"})
   });
   const body=await response.json() as {error?:string;archived?:boolean};
   if(!response.ok||!body.archived)throw new Error(body.error??"Arquivamento não autorizado.");
   setActionMessage("Cadastro incompleto arquivado. Os dados de identificação foram preservados para bloquear novos testes.");
   setSelected(null);
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível arquivar.");}
  finally{setBusyTenant(null);}
 }
 const shown=data?.tenants??[];
 const members=data?.accounts??[];
 const statusCounts=data?.counts??{total:0,ready:0,live:0,action:0,archived:0};
 const totalMatched=data?.totalMatched??0;
 const pageSize=data?.pageSize??25;
 const totalPages=Math.max(1,Math.ceil(totalMatched/pageSize));
 return <section className="space-y-5" aria-label={mode==="companies"?"Empresas do controle central":"Acessos do controle central"}>
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div>
    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
     <Database size={14}/> Banco central SaaS
    </p>
    <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">{mode==="companies"?"Empresas e implantações":"Proprietários e acessos multiempresa"}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{mode==="companies"?
     "Cadastros do Neon central, incluindo empresas que ainda não têm usuário ativo.":
     "Contas ativas e proprietários aguardando a primeira senha, separados do ERP antigo."}</p>
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
  {mode==="companies" && data?.billingReadiness && <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" aria-label="Situação de pagamentos">
    <div className="flex flex-wrap items-start justify-between gap-3">
     <div>
      <h3 className="flex items-center gap-2 font-bold"><CreditCard size={18}/> Pagamentos Stripe</h3>
      <p className="mt-1 text-sm text-muted-foreground">
       {data.billingReadiness.liveConfigurationReady?
        "Configuração de produção presente; ainda é necessário homologar o webhook e a conciliação antes da primeira cobrança.":
        "Cobrança em produção ainda bloqueada. Nenhuma assinatura é iniciada automaticamente ao terminar o teste."}
      </p>
     </div>
     <span className={"rounded-full border px-3 py-1 text-xs font-bold "+(data.billingReadiness.liveConfigurationReady?
       "border-amber-500/30 text-amber-700 dark:text-amber-300":"border-red-500/30 text-red-700 dark:text-red-300")}>
       {data.billingReadiness.liveConfigurationReady?"Aguardando homologação":"Não liberado"}
     </span>
    </div>
    {!data.billingReadiness.liveConfigurationReady && <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
      <ShieldAlert size={17} className="mt-0.5 shrink-0"/>
      <p>Verificar: {data.billingReadiness.blockers.join(" · ")}</p>
    </div>}
    <p className="mt-2 text-xs text-muted-foreground">Pix pela Stripe: {data.billingReadiness.pixFlagEnabled?"flag habilitada — confirmar aprovação na conta":"ainda não habilitado"}.</p>
   </section>}
  <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
   <label className="relative flex-1">
    <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
    <span className="sr-only">Buscar {mode==="companies"?"empresas":"usuários"}</span>
    <input type="search" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
     placeholder={mode==="companies"?"Buscar empresa, e-mail ou código...":"Buscar usuário, e-mail ou empresa..."}
     className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"/>
   </label>
   {mode==="companies"&&<label className="relative flex items-center gap-2">
    <Filter className="text-muted-foreground" size={17}/>
    <span className="sr-only">Filtrar situação</span>
    <select value={filter} onChange={e=>{setFilter(e.target.value as FilterValue);setPage(1);}}
     className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm sm:w-auto">
     <option value="all">Todas as situações</option>
     <option value="attention">Exigem revisão</option>
     <option value="provisioning">Em implantação</option>
     <option value="ready">Banco preparado</option>
     <option value="active">Acesso liberado</option>
     <option value="archived">Arquivados ({statusCounts.archived})</option>
    </select>
   </label>}
  </div>
  {actionMessage&&<p role="status" className="rounded-xl border border-border bg-card p-4 text-sm font-semibold">{actionMessage}</p>}
  {error&&<div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
   <div className="flex items-center gap-2 font-bold"><ServerCrash size={17}/> Não foi possível sincronizar o Neon central</div>
   <p className="mt-1">Os acessos do ERP antigo permanecem disponíveis. {error}</p>
  </div>}
  {loading?<p className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin"/> Consultando empresas e permissões...</p>:
   !data? <Empty title="Dados temporariamente indisponíveis" detail="Tente atualizar; não confunda uma falha de conexão com uma lista de empresas vazia."/>:
   mode==="companies" ? (
    shown.length===0?<Empty title="Nenhuma empresa neste filtro" detail={statusCounts.total?"Limpe a busca ou selecione outra situação.":"O controle central ainda não contém empresas cadastradas."}/>:
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
        {data.adminOnboardingEnabled && t.state==="PROVISIONING" && !t.dbReady && t.jobState==="PENDING" && (t.jobAttempts??0)===0 && (
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
           {!t.ownerActive && !t.inviteStatus &&
            <button type="button" disabled={busyTenant===t.id}
              onClick={()=>void activate(t,"send-invite")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
              <Mail size={16}/> Enviar convite de primeiro acesso
            </button>}
           {t.ownerActive&&
            <button type="button" disabled={busyTenant===t.id}
              onClick={()=>void activate(t,"prepare-db")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/50 px-4 py-2 text-sm font-bold text-primary disabled:opacity-50">
              <Database size={16}/> Preparar banco após confirmação do e-mail
            </button>}
           {busyTenant===t.id&&<span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={16} className="animate-spin"/> Processando...</span>}
          </div>
        )}
        {t.state!=="SUSPENDED" && ["PENDING","PROVISIONING"].includes(t.state) && !t.dbReady &&
          !t.ownerActive && t.members===0 && !t.inviteStatus && t.license==="PENDING" && (t.jobAttempts??0)===0 &&
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
           <button type="button" disabled={busyTenant===t.id} onClick={()=>void archive(t)}
             className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-500/30 px-4 text-sm font-semibold text-red-600 disabled:opacity-50">
             <Archive size={16}/> Arquivar cadastro incompleto
           </button>
           <span className="text-xs text-muted-foreground">A ação é recusada se houver qualquer recurso ou cobrança registrada.</span>
          </div>}
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
         <ShieldCheck size={17}/>
         <span>Consulta somente leitura. As ações de ativação, quando disponíveis, exigem confirmação administrativa e validam o banco antes de executar.</span>
         <a href={"mailto:"+t.email} className="ml-auto inline-flex items-center gap-1 font-semibold text-foreground underline underline-offset-4"><Mail size={14}/> Contatar proprietário</a>
        </div>
       </div>}
      </article>;
     })}
    </div>
   ) : (
    members.length===0?<Empty title="Nenhum acesso encontrado" detail={search?"Tente outra busca.":"Ainda não existem identidades ativadas no controle central. Os cadastros pendentes estão na aba Empresas."}/>:
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
     <table className="w-full min-w-[650px] text-left text-sm">
      <thead className="bg-muted/70 text-xs text-muted-foreground"><tr>
       <th className="p-4">Usuário</th><th className="p-4">Empresa</th><th className="p-4">Perfil</th><th className="p-4">Situação</th>
      </tr></thead>
      <tbody>{members.map(a=><tr key={a.id+":"+a.tenantId} className="border-t border-border">
       <td className="p-4"><p className="font-semibold">{a.name}</p><p className="mt-1 break-all text-xs text-muted-foreground">{a.email}</p></td>
       <td className="p-4">{a.source==="PLATFORM"?"Gestão central":a.tenantName??"Não associado"}</td>
       <td className="p-4">{a.role==="OWNER"?"Proprietário":a.role==="PENDING_OWNER"?"Proprietário pendente":a.role==="PLATFORM"?"Administrador central":a.role}</td>
       <td className="p-4">{(()=>{
        const canAccess=a.source==="PLATFORM"?a.enabled:
          a.source==="TENANT"&&a.enabled&&a.tenantState==="READY"&&["TRIAL","ACTIVE","GRACE"].includes(a.license??"");
        const label=a.source==="PENDING"?"Aguardando ativação":canAccess?"Acesso liberado":a.enabled?"Ambiente ou licença pendente":"Desativado";
        return <span className={"inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold "+(canAccess?"border-emerald-600/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400":"border-amber-600/25 bg-amber-500/10 text-amber-700 dark:text-amber-300")}>{label}</span>;
       })()}</td>
      </tr>)}</tbody>
     </table>
    </div>
   )}
  {data&&totalMatched>0&&<nav aria-label="Páginas do banco central" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-sm">
   <p className="text-muted-foreground">
    Registros {Math.min((page-1)*pageSize+1,totalMatched)}–{Math.min(page*pageSize,totalMatched)} de {totalMatched}
   </p>
   <div className="flex items-center gap-3">
    <button type="button" disabled={page<=1||updating} onClick={()=>setPage(p=>Math.max(1,p-1))}
     className="min-h-10 rounded-lg border border-border px-3 font-semibold disabled:opacity-40">Anterior</button>
    <span className="text-xs font-semibold">{page} / {totalPages}</span>
    <button type="button" disabled={page>=totalPages||updating} onClick={()=>setPage(p=>p+1)}
     className="min-h-10 rounded-lg border border-border px-3 font-semibold disabled:opacity-40">Próxima</button>
   </div>
  </nav>}
  {data&&<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
   <span><ShieldCheck size={14} className="mr-1 inline"/> Consulta protegida por administrador · dados separados por empresa</span>
   <span>{lastRefresh?"Atualizado às "+lastRefresh.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"Aguardando atualização"} · atualização automática a cada 60 segundos</span>
  </div>}
 </section>;
}
