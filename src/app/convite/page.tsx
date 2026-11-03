"use client";
import {useEffect,useState,type FormEvent} from "react";
import Link from "next/link";
export default function ConvitePage(){
  const [token,setToken]=useState("");
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [error,setError]=useState("");
  const [done,setDone]=useState(false);
  const [provisioning,setProvisioning]=useState(false);
  const [loading,setLoading]=useState(false);
  useEffect(()=>{setToken(new URLSearchParams(window.location.search).get("token")??"");
    // Strip the one-time secret from the visible address bar after reading.
    window.history.replaceState(null,"","/convite");},[]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");
    if(password!==confirm){setError("As senhas não coincidem.");return;}
    setLoading(true);
    try{
      const res=await fetch("/api/saas/convites/aceitar",{method:"POST",
        headers:{"Content-Type":"application/json"},body:JSON.stringify({token,password})});
      const data=await res.json() as {error?:string;provisioning?:boolean};
      if(!res.ok)throw new Error(data.error??"Não foi possível validar o convite.");
      setProvisioning(Boolean(data.provisioning));setDone(true);setToken("");setPassword("");setConfirm("");
    }catch(e){setError(e instanceof Error?e.message:"Falha de ativação.");}
    finally{setLoading(false)}
  }
  return <main className="min-h-dvh flex items-center justify-center bg-background p-4">
    <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-5">
      <h1 className="text-2xl font-bold">Ativar acesso ao lava-rápido</h1>
      <p className="text-sm text-muted-foreground">Confirme seu e-mail criando uma senha segura. Cada estabelecimento terá seu próprio banco de dados, e os 7 dias gratuitos só começam quando ele estiver pronto.</p>
      {done?<div role="status" className="space-y-4"><p>{provisioning?"Senha criada e e-mail confirmado! Seu ambiente individual está aguardando a preparação final. Enviaremos uma confirmação quando o acesso estiver pronto; o período de teste, se aplicável, ainda não começou e nenhuma cobrança é feita por essa ação.":"Senha criada com sucesso! Seu acesso está pronto."}</p>
        {!provisioning&&<Link href="/login" className="font-bold underline">Entrar no sistema</Link>}</div>:
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium">Senha (12+ caracteres, letras maiúsculas/minúsculas e número)
          <input type="password" required minLength={12} maxLength={128} autoComplete="new-password"
            value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 h-12 w-full rounded-xl border p-3 bg-background"/>
        </label>
        <label className="block text-sm font-medium">Confirmar senha
          <input type="password" required autoComplete="new-password"
            value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-2 h-12 w-full rounded-xl border p-3 bg-background"/>
        </label>
        {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={loading||!token} className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-50">
          {loading?"Ativando...":"Ativar meu acesso"}</button>
        {!token&&<p className="text-sm text-muted-foreground">Convite ausente. Solicite um novo link ao responsável pela plataforma.</p>}
      </form>}
    </section>
  </main>
}
