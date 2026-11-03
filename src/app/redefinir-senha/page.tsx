"use client";
import {useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {ArrowLeft,LockKeyhole,Eye,EyeOff,Loader2} from "lucide-react";
import {Suspense} from "react";
function ResetForm(){
 const query=useSearchParams();
 const token=query.get("token")??"";
 const [password,setPassword]=useState(""),[confirm,setConfirm]=useState("");
 const [show,setShow]=useState(false),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState("");
 async function submit(event:React.FormEvent){
  event.preventDefault();setError("");
  if(password!==confirm){setError("As senhas não coincidem.");return;}
  setBusy(true);
  try{
   const response=await fetch("/api/auth/redefinir-senha",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({token,password})
   });
   const data=await response.json() as {error?:string};
   if(!response.ok)throw new Error(data.error??"O link não pôde ser utilizado.");
   setDone(true);setPassword("");setConfirm("");
   window.history.replaceState({}, "", "/redefinir-senha");
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível redefinir.");}
  finally{setBusy(false)}
 }
 return <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-9">
  <p className="text-xs font-bold tracking-widest text-primary">DUCHA ELITTE</p>
  <h1 className="mt-4 text-2xl font-bold">Criar nova senha</h1>
  {done?<div role="status" className="mt-6 rounded-xl border p-4 text-sm">Senha atualizada. Você já pode acessar sua conta.</div>:
   token.length!==43?<p role="alert" className="mt-4 text-sm text-destructive">Link inválido. Solicite outro e-mail de recuperação.</p>:
   <form onSubmit={submit} className="mt-6 space-y-4">
    <p className="text-sm text-muted-foreground">Use no mínimo 12 caracteres com letras maiúsculas, minúsculas e números.</p>
    <label htmlFor="new-password" className="block text-sm font-semibold">Nova senha</label>
    <div className="relative">
     <input id="new-password" type={show?"text":"password"} autoComplete="new-password" value={password}
      onChange={e=>setPassword(e.target.value)} minLength={12} maxLength={128} required
      className="h-12 w-full rounded-xl border border-border bg-background px-4 pr-12 text-base"/>
     <button type="button" onClick={()=>setShow(!show)} aria-label={show?"Ocultar senha":"Mostrar senha"}
      className="absolute right-2 top-1 flex size-10 items-center justify-center">{show?<EyeOff size={18}/>:<Eye size={18}/>}</button>
    </div>
    <label htmlFor="confirm-password" className="block text-sm font-semibold">Confirme a nova senha</label>
    <input id="confirm-password" type={show?"text":"password"} autoComplete="new-password" value={confirm}
     onChange={e=>setConfirm(e.target.value)} required minLength={12} maxLength={128}
     className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base"/>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-primary-foreground disabled:opacity-50">
     {busy?<Loader2 className="animate-spin" size={18}/>:<LockKeyhole size={18}/>}
     {busy?"Salvando...":"Salvar nova senha"}
    </button>
   </form>}
  <Link href="/login" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">
   <ArrowLeft size={17}/> Voltar ao login
  </Link>
 </section>;
}
export default function ResetPage(){
 return <main className="flex min-h-dvh items-center justify-center bg-background p-4 text-foreground">
  <Suspense fallback={<p>Carregando...</p>}><ResetForm/></Suspense>
 </main>;
}
