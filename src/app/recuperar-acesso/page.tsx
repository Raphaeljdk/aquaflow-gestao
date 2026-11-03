"use client";
import {useState,type FormEvent} from "react";
import Link from "next/link";
import {ArrowLeft,Mail,Loader2,ShieldCheck} from "lucide-react";
export default function RecuperarAcesso(){
 const [email,setEmail]=useState("");
 const [tenantSlug,setTenantSlug]=useState("");
 const [loading,setLoading]=useState(false);
 const [done,setDone]=useState(false);
 const [error,setError]=useState("");
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setLoading(true);setError("");
  try{
   const response=await fetch("/api/auth/solicitar-recuperacao",{method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({email,tenantSlug})});
   if(!response.ok)throw new Error("Não foi possível enviar a solicitação. Confira os campos.");
   setDone(true);
  }catch(e){setError(e instanceof Error?e.message:"Erro temporário. Tente novamente.");}
  finally{setLoading(false);}
 }
 return <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
  <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lg sm:p-9">
   <Link href="/login" className="mb-7 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
    <ArrowLeft size={16}/> Voltar ao login</Link>
   <p className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-primary">Ducha Elitte · Segurança</p>
   <h1 className="text-2xl font-bold">Recuperar ou ativar acesso</h1>
   <p className="mt-3 text-sm leading-6 text-muted-foreground">
    Se já tiver uma conta, enviaremos um link para criar uma nova senha. Se seu cadastro ainda estiver em implantação,
    você receberá orientações sobre a ativação.</p>
   {done?<div role="status" className="mt-7 rounded-2xl border border-primary/30 bg-primary/10 p-5">
    <div className="mb-3 flex items-center gap-2 font-bold"><ShieldCheck size={19}/> Solicitação recebida</div>
    <p className="text-sm leading-6">Se houver cadastro para esse e-mail, você receberá instruções. Confira também o Spam.
    O link de recuperação expira em 20 minutos.</p>
    <Link href="/login" className="mt-4 inline-block font-semibold text-primary underline">Voltar ao login</Link>
   </div>:<form onSubmit={submit} className="mt-7 space-y-4">
    <label className="block space-y-2 text-sm font-semibold">E-mail cadastrado
     <input type="email" required autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}
      className="h-12 w-full min-w-0 rounded-xl border border-border bg-background px-4 text-base font-normal" placeholder="seuemail@exemplo.com"/>
    </label>
    <label className="block space-y-2 text-sm font-semibold">Código do lava-rápido (opcional)
     <input type="text" autoComplete="off" maxLength={60} value={tenantSlug} onChange={e=>setTenantSlug(e.target.value.toLowerCase())}
      className="h-12 w-full min-w-0 rounded-xl border border-border bg-background px-4 text-base font-normal" placeholder="Informe se sua conta pertence a outro lava-rápido"/>
    </label>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-50">
     {loading?<Loader2 size={18} className="animate-spin"/>:<Mail size={18}/>}
     {loading?"Solicitando...":"Enviar instruções por e-mail"}
    </button>
   </form>}
   <p className="mt-7 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
    Nunca envie sua senha ao suporte. A recuperação não gera cobrança nem cria outro banco de dados.
   </p>
  </section>
 </main>;
}
