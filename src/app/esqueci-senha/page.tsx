"use client";
import {useState} from "react";
import Link from "next/link";
import {Mail,ArrowLeft,Loader2} from "lucide-react";
export default function ForgotPassword(){
 const [email,setEmail]=useState("");
 const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState("");
 async function submit(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError("");
  try{
   const response=await fetch("/api/auth/esqueci-senha",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})
   });
   const data=await response.json() as {error?:string};
   if(!response.ok)throw new Error(data.error??"Não foi possível processar.");
   setDone(true);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível processar.");}
  finally{setBusy(false)}
 }
 return <main className="flex min-h-dvh items-center justify-center bg-background p-4 text-foreground">
  <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-9">
   <p className="text-xs font-bold tracking-widest text-primary">DUCHA ELITTE</p>
   <h1 className="mt-4 text-2xl font-bold">Esqueceu sua senha?</h1>
   <p className="mt-2 text-sm leading-6 text-muted-foreground">
    Informe o e-mail da conta para receber um link seguro de redefinição. Ele vale por 30 minutos.
   </p>
   {done?<div role="status" className="mt-6 rounded-xl border p-4 text-sm leading-6">
    Se o e-mail tiver uma conta ativa, enviaremos um link de redefinição.
    Se o cadastro ainda não foi ativado, solicite o convite de acesso ao suporte.
   </div>:
   <form onSubmit={submit} className="mt-6 space-y-4">
    <label htmlFor="reset-email" className="block text-sm font-semibold">E-mail cadastrado</label>
    <input id="reset-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}
     className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base" placeholder="seuemail@empresa.com.br" required maxLength={254}/>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-primary-foreground disabled:opacity-50">
     {busy?<Loader2 className="animate-spin" size={18}/>:<Mail size={18}/>}
     {busy?"Enviando...":"Enviar link para redefinir senha"}
    </button>
   </form>}
   <Link href="/login" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">
    <ArrowLeft size={17}/> Voltar ao login
   </Link>
  </section>
 </main>;
}
