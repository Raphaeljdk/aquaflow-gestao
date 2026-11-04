"use client";
import {useCallback,useEffect,useState} from "react";
import {signOut} from "next-auth/react";
type Tenant={id:string;slug:string;provisionamento:string;licenca:string|null;
 usuariosAtivos:number;proprietarioAtivo:boolean;bancoConfigurado:boolean;testeExpiraEm:string|null;
 stripeHabilitada:boolean;stripePixHabilitado:boolean};
export function SaasProductionDashboard(){
 const [rows,setRows]=useState<Tenant[]>([]);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const reload=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const r=await fetch("/api/plataforma/saas/pilotos",{cache:"no-store"});
   const j=await r.json() as {tenants?:Tenant[];error?:string};
   if(!r.ok)throw new Error(j.error||"Painel central indisponível.");
   setRows(j.tenants??[]);
  }catch(e){setError(e instanceof Error?e.message:"Falha.");}
  finally{setLoading(false)}
 },[]);
 useEffect(()=>{void reload()},[reload]);
 async function action(t:Tenant,type:"convidar"|"checkout",plan?:"MENSAL"|"ANUAL_MENSAL"|"ANUAL_AVISTA",method?:"CARD"|"PIX"){
  setError("");setMessage("");setBusy(t.id);
  try{
   if(type==="checkout" && !window.confirm("Confirma a emissão de um link de pagamento REAL para o proprietário cadastrado? O pagamento depende da ação do cliente."))
    return;
   const r=await fetch("/api/plataforma/saas/pilotos/"+encodeURIComponent(t.id)+"/"+type,{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(type==="checkout"?{plan,method}:{})
   });
   const j=await r.json() as {error?:string;url?:string;inviteUrl?:string};
   if(!r.ok)throw new Error(j.error||"Não foi possível executar.");
   if(j.url||j.inviteUrl){
    await navigator.clipboard.writeText((j.url||j.inviteUrl)!);
    setMessage(type==="checkout"?"Link de cobrança Stripe copiado. Somente compartilhe com proprietário autorizado.":"Convite protegido copiado. Envie somente ao proprietário.");
   }else setMessage("Operação registrada. O cadastro e o provisionamento são automáticos.");
   await reload();
  }catch(e){setError(e instanceof Error?e.message:"Operação indisponível.");}
  finally{setBusy(null)}
 }
 return <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Ducha Elitte · controle central</p>
    <h1 className="text-3xl font-black">Gestão da plataforma</h1>
    <p className="mt-2 text-sm text-muted-foreground">Gestão das empresas, contas individuais, testes e assinaturas.</p></div>
   <div className="flex gap-2">
    <button className="rounded-xl border px-4 py-2 text-sm" onClick={()=>void reload()}>Atualizar</button>
    <button className="rounded-xl border px-4 py-2 text-sm" onClick={()=>void signOut({callbackUrl:"/login"})}>Sair</button>
   </div>
  </div>
  <p className="rounded-xl border p-3 text-sm">O proprietário recebe automaticamente o link de criação de senha no cadastro. Depois de confirmar o e-mail, o banco individual é preparado sem aprovação manual. Cobranças continuam separadas, condicionadas à confirmação do pagamento.</p>
  {error&&<p role="alert" className="rounded-lg border p-3 text-sm text-destructive">{error}</p>}
  {message&&<p role="status" className="rounded-lg border p-3 text-sm">{message}</p>}
  {loading?<p className="text-sm text-muted-foreground">Consultando controle central...</p>:
   !rows.length?<p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada neste controle central.</p>:
   <div className="grid gap-3 sm:grid-cols-2">{rows.map(t=>
    <article key={t.id} className="space-y-3 rounded-xl border bg-card p-4">
     <h2 className="font-bold">{t.slug}</h2>
     <p className="text-sm">Banco: {t.bancoConfigurado?"Configurado":"Pendente"} · Licença: {t.licenca??"Pendente"}</p>
     <p className="text-xs text-muted-foreground">Provisionamento: {t.provisionamento} · Usuários ativos: {t.usuariosAtivos} · Proprietário: {t.proprietarioAtivo?"confirmado":"pendente"}</p>
     <div className="flex flex-wrap gap-2">
      <button disabled={busy===t.id||t.provisionamento!=="READY"||t.usuariosAtivos>0} onClick={()=>void action(t,"convidar")} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Recuperar convite (suporte)</button>
      <button disabled={busy===t.id||t.provisionamento!=="READY"||!t.proprietarioAtivo||!t.stripeHabilitada} onClick={()=>void action(t,"checkout","MENSAL","CARD")} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Mensal R$ 80 — sem fidelidade</button>
      <button disabled={busy===t.id||t.provisionamento!=="READY"||!t.proprietarioAtivo||!t.stripeHabilitada} onClick={()=>void action(t,"checkout","ANUAL_MENSAL","CARD")} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Anual 12 × R$ 80</button>
      <button disabled={busy===t.id||t.provisionamento!=="READY"||!t.stripeHabilitada} onClick={()=>void action(t,"checkout","ANUAL_AVISTA","CARD")} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Cobrar R$ 790</button>
      {t.stripePixHabilitado&&<button disabled={busy===t.id||t.provisionamento!=="READY"||!t.stripeHabilitada} onClick={()=>void action(t,"checkout","ANUAL_AVISTA","PIX")} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Pix R$ 790</button>}
     </div>
    </article>)}</div>}
 </main>
}
