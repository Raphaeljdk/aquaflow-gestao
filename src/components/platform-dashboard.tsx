"use client";
import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Check, Clock3, ExternalLink, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { PartnersManager } from "@/components/partners-manager";
import { PlatformTickets } from "@/components/platform-tickets";
type Status = "PENDENTE" | "EM_ANALISE" | "APROVADO" | "REJEITADO";
type Account = { id: string; name:string; email:string; role:string; ativo:boolean; createdAt:string };
type Request = {
  id: string; nomeEmpresa: string; cnpj: string; razaoSocial: string; nomeResponsavel: string; email: string;
  whatsapp: string; cidade: string; mensagem: string; status: Status;
  formaPagamentoPrevista: string; mensalidadeCentavos: number | null; cienciaCondicoesComerciaisEm: string | null;
  createdAt: string; revisadoEm: string | null; observacoesInternas: string;
};
const labels:Record<Status,string> = {PENDENTE:"Pendente",EM_ANALISE:"Em análise",APROVADO:"Aprovada",REJEITADO:"Rejeitada"};
export function PlatformDashboard() {
  const [requests,setRequests] = useState<Request[]>([]);
  const [accounts,setAccounts] = useState<Account[]>([]);
  const [busy,setBusy] = useState<string|null>(null);
  const [loading,setLoading] = useState(true);
  const [tab,setTab] = useState<"solicitacoes" | "parceiros" | "acessos" | "chamados">("solicitacoes");
  const [error,setError] = useState("");
  const load = useCallback(async()=>{
    setLoading(true);setError("");
    try {
      const res = await fetch("/api/plataforma/solicitacoes",{cache:"no-store"});
      if(!res.ok)throw new Error(res.status===403?"Acesso restrito ao administrador central.":"Não foi possível carregar as solicitações.");
      const body=await res.json() as {solicitacoes:Request[]};
      setRequests(body.solicitacoes);
      const usersRes = await fetch("/api/plataforma/usuarios",{cache:"no-store"});
      if (usersRes.ok) {
        const usersBody = await usersRes.json() as {usuarios:Account[]};
        setAccounts(usersBody.usuarios);
      }
    }catch(e){setError(e instanceof Error?e.message:"Erro ao carregar.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  async function change(item:Request,status:Status){
    setBusy(item.id);setError("");
    try{
      const res=await fetch("/api/plataforma/solicitacoes/"+encodeURIComponent(item.id),{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({status,observacoesInternas:item.observacoesInternas}),
      });
      if(!res.ok)throw new Error("Não foi possível atualizar a solicitação.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar.");}
    finally{setBusy(null);}
  }
  async function toggleAccount(account: Account) {
    setBusy(account.id); setError("");
    try {
      const res = await fetch("/api/plataforma/usuarios/" + encodeURIComponent(account.id), {
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ativo: !account.ativo}),
      });
      const data = await res.json() as {error?:string};
      if (!res.ok) throw new Error(data.error || "Não foi possível alterar o acesso.");
      await load();
    } catch(e) {setError(e instanceof Error?e.message:"Não foi possível atualizar a conta.");}
    finally {setBusy(null);}
  }
  return <main className="min-h-dvh bg-background text-foreground">
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-7">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-muted-foreground"><ShieldCheck size={16}/> Administração da plataforma</p>
          <h1 className="mt-3 text-3xl font-bold">Gestão da plataforma</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Acompanhe novos interessados, parceiros, chamados de suporte e acessos desta instância.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>void load()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold"><RefreshCw size={16}/> Atualizar</button>
          <button type="button" onClick={() => void signOut({ callbackUrl: "/login" })} className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold">Sair com segurança</button>
        </div>
      </header>
      <nav aria-label="Seções da administração" className="my-7 flex flex-wrap gap-2 border-b border-border pb-4">
        {([
          ["solicitacoes","Solicitações"],
          ["parceiros","Parceiros"],
          ["chamados","Chamados de suporte"],
          ["acessos","Acessos"],
        ] as const).map(([key,label])=>(
          <button key={key} type="button" aria-current={tab===key?"page":undefined}
            onClick={()=>setTab(key)}
            className={"min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors " +
              (tab===key?"bg-primary text-primary-foreground":"border border-border bg-card text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
      </nav>
      {tab==="parceiros" && <PartnersManager />}
      {tab==="chamados" && <PlatformTickets />}
      {tab==="solicitacoes" && <>
      <div className="my-8 grid gap-4 sm:grid-cols-3">
        {[["Pendentes",requests.filter(x=>x.status==="PENDENTE").length],
          ["Em análise",requests.filter(x=>x.status==="EM_ANALISE").length],
          ["Total de solicitações",requests.length]].map(([label,value])=><div key={label} className="rounded-2xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}
      </div>
      {error&&<p role="alert" className="mb-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
      {loading&&<p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={17} className="animate-spin"/> Carregando solicitações...</p>}
      {!loading&&requests.length===0&&<p className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">Ainda não há solicitações cadastradas.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {requests.map(item=><article key={item.id} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{item.nomeEmpresa}</h2>
            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold">{labels[item.status]}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{item.nomeResponsavel} · {item.cidade}</p>
          {item.cnpj && <p className="mt-1 break-words text-xs text-muted-foreground">CNPJ: {item.cnpj}{item.razaoSocial && " · " + item.razaoSocial}</p>}
          <p className="mt-1 text-xs text-muted-foreground"><Clock3 size={13} className="mr-1 inline"/> {new Date(item.createdAt).toLocaleDateString("pt-BR")}</p>
          <div className="mt-5 space-y-2 text-sm">
            <a href={"mailto:"+item.email} className="block break-all font-medium underline underline-offset-4">{item.email}</a>
            <a href={"https://wa.me/"+item.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium underline underline-offset-4"><ExternalLink size={14}/> {item.whatsapp}</a>
            {item.mensagem&&<p className="rounded-xl bg-muted p-3 text-sm leading-6">{item.mensagem}</p>}
            <div className="space-y-1 rounded-xl border border-border bg-muted/50 p-3 text-xs leading-5">
              <p className="font-semibold">Condições comerciais previstas</p>
              <p>Implantação: valor a definir · Mensalidade: {item.mensalidadeCentavos === null ? "não informada na solicitação antiga" : (item.mensalidadeCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + "/mês"}</p>
              <p>Pagamento da assinatura: {item.formaPagamentoPrevista === "CARTAO_DEBITO" ? "Cartão de débito" : "Condição antiga registrada: " + item.formaPagamentoPrevista}</p>
              <p className="text-muted-foreground">{item.cienciaCondicoesComerciaisEm ? "Interessado ciente das condições apresentadas no momento do cadastro." : "Solicitação anterior à confirmação das condições comerciais."}</p>
              <p className="text-muted-foreground">A solicitação não efetua cobranças. Recebimentos das lavagens permanecem separados da assinatura.</p>
            </div>
          </div>
          <label className="mt-5 block space-y-2 text-xs font-semibold text-muted-foreground">
            <span>Notas internas (somente administrador)</span>
            <textarea maxLength={1000} rows={2} value={item.observacoesInternas}
              onChange={e=>setRequests(items=>items.map(i=>i.id===item.id?{...i,observacoesInternas:e.target.value}:i))}
              className="w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground"/>
          </label>
          <div className="mt-5 flex flex-wrap gap-2">
            <button disabled={busy===item.id} onClick={()=>void change(item,"EM_ANALISE")} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50">Em análise</button>
            <button disabled={busy===item.id} onClick={()=>void change(item,"APROVADO")} className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"><Check size={14}/> Aprovar análise</button>
            <button disabled={busy===item.id} onClick={()=>void change(item,"REJEITADO")} className="inline-flex items-center gap-1 rounded-xl border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-50"><X size={14}/> Rejeitar</button>
          </div>
        </article>)}
      </div>
      </>}
      {tab==="acessos" && (
      <section className="mt-12 border-t border-border pt-8">
        <h2 className="text-2xl font-bold">Logins existentes nesta instância</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Controle inicial de acessos. A administração de logins de vários estabelecimentos só estará disponível após a implementação do isolamento multiempresa.
        </p>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr><th className="p-4">Usuário</th><th className="p-4">Perfil</th><th className="p-4">Situação</th><th className="p-4">Ação</th></tr>
            </thead>
            <tbody>
              {accounts.map(account=><tr key={account.id} className="border-t border-border">
                <td className="p-4"><p className="font-semibold">{account.name}</p><p className="mt-1 text-xs text-muted-foreground">{account.email}</p></td>
                <td className="p-4">{account.role}</td>
                <td className="p-4">{account.ativo?"Ativo":"Desativado"}</td>
                <td className="p-4">
                  <button type="button" onClick={()=>void toggleAccount(account)} disabled={busy===account.id || account.email.toLowerCase()==="plataforma@duchaelitte.com.br"}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-40">
                    {account.ativo?"Desativar acesso":"Reativar acesso"}
                  </button>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>
      )}
    </div>
  </main>;
}
