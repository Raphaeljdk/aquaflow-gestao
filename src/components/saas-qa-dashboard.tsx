"use client";
import {useCallback,useEffect,useState} from "react";
import {signOut} from "next-auth/react";
type Pilot={
 id:string;slug:string;provisionamento:string;licenca:string|null;usuariosAtivos:number;
 bancoConfigurado:boolean;testeJaIniciado:boolean;testeExpiraEm:string|null;aptoParaTeste:boolean;stripeHabilitada:boolean;stripePixHabilitado:boolean;
};
export function SaasQaDashboard(){
 const [tenants,setTenants]=useState<Pilot[]>([]);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const res=await fetch("/api/plataforma/saas/pilotos",{cache:"no-store"});
   const json=await res.json() as {tenants?:Pilot[];error?:string};
   if(!res.ok)throw new Error(json.error||"Painel SaaS indisponível.");
   setTenants(json.tenants??[]);
  }catch(e){setError(e instanceof Error?e.message:"Falha ao carregar.");}
  finally{setLoading(false)}
 },[]);
 useEffect(()=>{void load()},[load]);
 async function checkout(p:Pilot,plan:"ANUAL_MENSAL"|"ANUAL_AVISTA",method:"CARD"|"PIX"){
  setBusy(p.id);setError("");setMessage("");
  try{
   const res=await fetch("/api/plataforma/saas/pilotos/"+encodeURIComponent(p.id)+"/checkout",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan,method})});
   const json=await res.json() as {url?:string;error?:string};
   if(!res.ok||!json.url)throw new Error(json.error??"Não foi possível gerar link.");
   await navigator.clipboard.writeText(json.url);
   setMessage("Link de CHECKOUT DE TESTE da Stripe copiado. Envie somente para o proprietário validado; nenhuma cobrança real foi iniciada.");
  }catch(e){setError(e instanceof Error?e.message:"Erro no checkout de teste.");}
  finally{setBusy(null)}
 }
 async function perform(p:Pilot,action:"aprovar"|"convidar"){
  setBusy(p.id);setError("");setMessage("");
  try{
   const res=await fetch("/api/plataforma/saas/pilotos/"+encodeURIComponent(p.id)+"/"+action,{
     method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
   const json=await res.json() as {error?:string;inviteUrl?:string;queued?:boolean};
   if(!res.ok)throw new Error(json.error??"Operação não concluída.");
   if(action==="convidar" && json.inviteUrl){
    await navigator.clipboard.writeText(json.inviteUrl);
    setMessage("Convite seguro copiado. Envie somente ao proprietário correto (vence em 24h).");
   }else setMessage("Empresa enviada à fila de provisionamento. A licença ainda não começou.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Falha na operação.");}
  finally{setBusy(null)}
 }
 return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
  <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
    <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ambiente de homologação</p>
      <h1 className="mt-1 text-3xl font-black">Pilotos SaaS Ducha Elitte</h1>
      <p className="mt-2 text-sm text-muted-foreground">Bancos individuais, convites e teste gratuito controlados pelo servidor central.</p></div>
    <div className="flex gap-2">
      <button onClick={()=>void load()} className="rounded-xl border px-4 py-2 text-sm font-semibold">Atualizar</button>
      <button onClick={()=>void signOut({callbackUrl:"/login"})} className="rounded-xl border px-4 py-2 text-sm font-semibold">Sair</button>
    </div>
  </div>
  <div className="rounded-xl border p-4 text-sm text-muted-foreground">
    Aprovar somente estabelecimentos autorizados. O provisionamento roda em worker protegido; nenhum banco novo é criado pelo navegador.
    O teste de 168 horas só é iniciado após o proprietário aceitar o convite e criar sua senha.
  </div>
  {message&&<p role="status" className="rounded-xl border p-4 text-sm">{message}</p>}
  {error&&<p role="alert" className="rounded-xl border border-destructive p-4 text-sm text-destructive">{error}</p>}
  {loading?<p className="text-muted-foreground">Consultando o banco central...</p>:
  !tenants.length?<p className="text-muted-foreground">Nenhuma empresa solicitou teste.</p>:
  <div className="grid gap-4 sm:grid-cols-2">{tenants.map(p=><article key={p.id} className="rounded-2xl border bg-card p-5 space-y-4">
    <div><h2 className="text-xl font-bold">{p.slug}</h2><p className="text-xs text-muted-foreground">Identificador interno: {p.id.slice(0,8)}</p></div>
    <dl className="grid grid-cols-2 gap-3 text-sm">
      <div><dt className="text-muted-foreground">Provisionamento</dt><dd className="font-semibold">{p.provisionamento}</dd></div>
      <div><dt className="text-muted-foreground">Licença</dt><dd className="font-semibold">{p.licenca??"PENDENTE"}</dd></div>
      <div><dt className="text-muted-foreground">Banco separado</dt><dd className="font-semibold">{p.bancoConfigurado?"Validado":"Pendente"}</dd></div>
      <div><dt className="text-muted-foreground">Usuários ativos</dt><dd className="font-semibold">{p.usuariosAtivos}</dd></div>
    </dl>
    {p.testeExpiraEm&&<p className="text-sm">Fim do teste: {new Date(p.testeExpiraEm).toLocaleString("pt-BR")}</p>}
    <div className="flex flex-wrap gap-2">
      {p.provisionamento==="PENDING"&&
        <button disabled={busy===p.id} onClick={()=>void perform(p,"aprovar")}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">Aprovar e provisionar</button>}
      {p.provisionamento==="READY"&&p.licenca==="PENDING"&&p.usuariosAtivos===0&&
        <button disabled={busy===p.id} onClick={()=>void perform(p,"convidar")}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">Gerar convite ao proprietário</button>}
      {p.aptoParaTeste&&<span className="rounded-xl border px-4 py-2 text-xs font-semibold">Conta preparada para validação</span>}
      {p.provisionamento==="READY"&&p.usuariosAtivos>0&&p.stripeHabilitada&&<>
        <button disabled={busy===p.id} onClick={()=>void checkout(p,"ANUAL_MENSAL","CARD")}
          className="rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-50">Stripe teste: 12x R$ 80 no crédito</button>
        <button disabled={busy===p.id} onClick={()=>void checkout(p,"ANUAL_AVISTA","CARD")}
          className="rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-50">Stripe teste: R$ 790 crédito 1x</button>
        {p.stripePixHabilitado&&<button disabled={busy===p.id} onClick={()=>void checkout(p,"ANUAL_AVISTA","PIX")}
          className="rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-50">Stripe teste: R$ 790 Pix</button>}
      </>}
    </div>
  </article>)}</div>}
 </main>
}
