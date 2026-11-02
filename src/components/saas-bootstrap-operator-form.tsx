"use client";
import {useState} from "react";
export function BootstrapOperatorForm() {
 const [password,setPassword]=useState("");
 const [error,setError]=useState("");
 const [success,setSuccess]=useState(false);
 const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){
  e.preventDefault();setError("");setBusy(true);
  try{
   const res=await fetch("/api/plataforma/saas/bootstrap",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})
   });
   const body=await res.json() as {error?:string;created?:boolean};
   if(!res.ok||!body.created)throw new Error(body.error||"Falha ao criar gestor central.");
   setPassword("");setSuccess(true);
  }catch(err){setError(err instanceof Error?err.message:"Falha de cadastro.");}
  finally{setBusy(false)}
 }
 return <main className="mx-auto max-w-xl space-y-4 p-6 sm:p-10">
  <h1 className="text-2xl font-bold">Ativar gestor central</h1>
  <p className="text-sm text-muted-foreground">Este cadastro ocorre uma única vez e exige sessão de administrador existente. Não use a mesma senha de outros sistemas.</p>
  {success?<p role="status">Gestor central criado. O modo multiempresa ainda não foi ativado; mantenha os acessos atuais até o checklist de produção ser concluído.</p>:
  <form onSubmit={submit} className="space-y-4 rounded-xl border p-5">
   <label htmlFor="new-operator-password" className="block text-sm font-semibold">Nova senha central (mínimo 16 caracteres)</label>
   <input id="new-operator-password" className="w-full rounded-lg border bg-background p-3" type="password" autoComplete="new-password" minLength={16} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)}/>
   {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
   <button disabled={busy} className="rounded-lg bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50" type="submit">{busy?"Salvando...":"Cadastrar gestor central"}</button>
  </form>}
 </main>
}
