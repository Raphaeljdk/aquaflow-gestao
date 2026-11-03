"use client";
import {useState,type FormEvent} from "react";
import {signOut} from "next-auth/react";
import {KeyRound,Loader2} from "lucide-react";
export function ChangePasswordCard(){
 const [currentPassword,setCurrentPassword]=useState("");
 const [newPassword,setNewPassword]=useState("");
 const [confirmPassword,setConfirmPassword]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setError("");
  if(newPassword!==confirmPassword){setError("As novas senhas não coincidem.");return;}
  setBusy(true);
  try{
   const response=await fetch("/api/auth/alterar-senha",{method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({currentPassword,newPassword})});
   const body=await response.json() as {error?:string};
   if(!response.ok)throw new Error(body.error||"Não foi possível alterar sua senha.");
   setCurrentPassword("");setNewPassword("");setConfirmPassword("");
   await signOut({callbackUrl:"/login"});
  }catch(e){setError(e instanceof Error?e.message:"Falha ao alterar senha.");setBusy(false);}
 }
 return <section className="panel mt-6 max-w-3xl space-y-4 p-4 sm:p-6">
  <div className="flex items-center gap-2">
   <KeyRound className="text-primary" size={21}/>
   <h2 className="text-lg font-bold">Segurança da minha conta</h2>
  </div>
  <p className="text-sm text-muted-foreground">
   Troque a sua senha sem alterar os dados da empresa. Por segurança, será necessário entrar novamente após salvar.
  </p>
  <form onSubmit={submit} className="max-w-md space-y-4">
   <label className="block space-y-2 text-sm font-semibold">Senha atual
    <input required type="password" autoComplete="current-password" maxLength={128}
     value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}
     className="h-12 w-full rounded-xl border border-border bg-background px-3 font-normal"/>
   </label>
   <label className="block space-y-2 text-sm font-semibold">Nova senha
    <input required type="password" autoComplete="new-password" minLength={12} maxLength={128}
     value={newPassword} onChange={e=>setNewPassword(e.target.value)}
     className="h-12 w-full rounded-xl border border-border bg-background px-3 font-normal"/>
   </label>
   <label className="block space-y-2 text-sm font-semibold">Confirme a nova senha
    <input required type="password" autoComplete="new-password" minLength={12} maxLength={128}
     value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}
     className="h-12 w-full rounded-xl border border-border bg-background px-3 font-normal"/>
   </label>
   <p className="text-xs leading-5 text-muted-foreground">Mínimo de 12 caracteres, com letra maiúscula, minúscula e número.</p>
   {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
   <button type="submit" disabled={busy} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50">
    {busy&&<Loader2 size={17} className="animate-spin"/>}{busy?"Salvando...":"Trocar minha senha"}
   </button>
  </form>
 </section>;
}
