"use client";
import {useEffect,useState,type FormEvent} from "react";
import Link from "next/link";
import {ArrowLeft,KeyRound,Loader2} from "lucide-react";
export default function RedefinirSenha(){
 const [token,setToken]=useState("");
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [loading,setLoading]=useState(false);
 const [done,setDone]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{
  setToken(new URLSearchParams(window.location.search).get("token")??"");
  window.history.replaceState(null,"","/redefinir-senha");
 },[]);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");
  if(password!==confirm){setError("As senhas não coincidem.");return;}
  setLoading(true);
  try{
   const res=await fetch("/api/auth/redefinir-senha",{method:"POST",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({token,password})});
   const body=await res.json() as {error?:string};
   if(!res.ok)throw new Error(body.error||"Link inválido ou expirado.");
   setDone(true);setPassword("");setConfirm("");setToken("");
  }catch(err){setError(err instanceof Error?err.message:"Não foi possível alterar a senha.");}
  finally{setLoading(false);}
 }
 return <main className="flex min-h-dvh items-center justify-center bg-background p-4 text-foreground">
  <section className="w-full max-w-md space-y-5 rounded-3xl border border-border bg-card p-6 shadow-lg sm:p-9">
   <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16}/> Voltar ao login</Link>
   <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Ducha Elitte · Segurança</p>
   <h1 className="text-2xl font-bold">Criar nova senha</h1>
   {done?<div role="status" className="space-y-4">
    <p>Senha atualizada. Entre novamente com seu e-mail e sua nova senha.</p>
    <Link href="/login" className="inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">Entrar no ERP</Link>
   </div>:<form onSubmit={submit} className="space-y-4">
    <p className="text-sm leading-6 text-muted-foreground">Escolha uma senha diferente da anterior, com no mínimo 12 caracteres, maiúscula, minúscula e número.</p>
    <label className="block space-y-2 text-sm font-semibold">Nova senha
     <input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password}
      onChange={e=>setPassword(e.target.value)}
      className="h-12 w-full min-w-0 rounded-xl border border-border bg-background px-4 text-base font-normal"/>
    </label>
    <label className="block space-y-2 text-sm font-semibold">Confirme a nova senha
     <input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={confirm}
      onChange={e=>setConfirm(e.target.value)}
      className="h-12 w-full min-w-0 rounded-xl border border-border bg-background px-4 text-base font-normal"/>
    </label>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    {!token&&<p role="alert" className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
     Link ausente ou já utilizado. <Link href="/recuperar-acesso" className="font-semibold text-primary underline">Solicite outro link.</Link>
    </p>}
    <button type="submit" disabled={loading||!token} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-50">
     {loading?<Loader2 size={18} className="animate-spin"/>:<KeyRound size={18}/>}
     {loading?"Alterando...":"Salvar nova senha"}
    </button>
   </form>}
  </section>
 </main>;
}
