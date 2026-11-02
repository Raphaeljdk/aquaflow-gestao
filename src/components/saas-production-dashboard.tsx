"use client";
import {useCallback,useEffect,useState} from "react";
import {signOut} from "next-auth/react";
type Tenant={id:string;slug:string;provisionamento:string;licenca:string|null;
 usuariosAtivos:number;bancoConfigurado:boolean;testeExpiraEm:string|null};
export function SaasProductionDashboard(){
 const [rows,setRows]=useState<Tenant[]>([]);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(true);
 const reload=useCallback(async()=>{
  setBusy(true);setError("");
  try{
   const r=await fetch("/api/plataforma/saas/overview",{cache:"no-store"});
   const j=await r.json() as {tenants?:Tenant[];error?:string};
   if(!r.ok)throw new Error(j.error||"Painel central indisponível.");
   setRows(j.tenants??[]);
  }catch(e){setError(e instanceof Error?e.message:"Falha.");}
  finally{setBusy(false)}
 },[]);
 useEffect(()=>{void reload()},[reload]);
 return <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-xs uppercase tracking-wider text-muted-foreground">AquaFlow · controle central</p>
    <h1 className="text-3xl font-black">Gestão da plataforma</h1>
    <p className="mt-2 text-sm text-muted-foreground">Acompanhamento de empresas e licenças, sem acesso aos bancos operacionais.</p></div>
   <div className="flex gap-2">
    <button className="rounded-xl border px-4 py-2 text-sm" onClick={()=>void reload()}>Atualizar</button>
    <button className="rounded-xl border px-4 py-2 text-sm" onClick={()=>void signOut({callbackUrl:"/login"})}>Sair</button>
   </div>
  </div>
  <div className="rounded-xl border bg-card p-4 text-sm">
   Recebimento Stripe em produção permanece bloqueado até validação completa da infraestrutura e contratos.
   Não há criação de cobranças neste painel.
  </div>
  {error&&<p role="alert" className="text-destructive">{error}</p>}
  {busy?<p className="text-sm text-muted-foreground">Consultando controle central...</p>:
   !rows.length?<p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada neste controle central.</p>:
   <div className="grid gap-3 sm:grid-cols-2">{rows.map(t=>
    <article key={t.id} className="space-y-2 rounded-xl border bg-card p-4">
     <h2 className="font-bold">{t.slug}</h2>
     <p className="text-sm">Banco: {t.bancoConfigurado?"Configurado":"Pendente"} · Licença: {t.licenca??"Pendente"}</p>
     <p className="text-xs text-muted-foreground">Provisionamento: {t.provisionamento} · Usuários ativos: {t.usuariosAtivos}</p>
    </article>)}</div>}
 </main>
}
