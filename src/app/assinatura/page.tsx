"use client";
import {Suspense,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {ArrowLeft,Check,Clock3,CreditCard,Loader2,LockKeyhole,Mail,ShieldCheck} from "lucide-react";
type Plan="MENSAL"|"ANUAL_MENSAL"|"ANUAL_AVISTA";
type Method="CARD"|"PIX";
const offers:{code:Plan;name:string;price:string;period:string;description:string}[]=[
 {code:"MENSAL",name:"Mensal flexível",price:"R$ 80",period:"por mês",
  description:"Assinatura recorrente no cartão. Renovação mensal enquanto o plano estiver ativo."},
 {code:"ANUAL_MENSAL",name:"Anual em 12 mensalidades",price:"12 × R$ 80",period:"R$ 960 no total",
  description:"Contrato de 12 meses, cobrado mensalmente no cartão. Não inclui uma 13ª mensalidade."},
 {code:"ANUAL_AVISTA",name:"Anual à vista",price:"R$ 790",period:"pagamento único",
  description:"12 meses de acesso, sem renovação automática neste pagamento."}
];
function PaymentPortal(){
 const params=useSearchParams();
 const [token,setToken]=useState("");
 const initialized=useRef(false);
 const [email,setEmail]=useState("");
 const [plan,setPlan]=useState<Plan>("MENSAL");
 const [method,setMethod]=useState<Method>("CARD");
 const [availability,setAvailability]=useState<{checkoutAvailable:boolean;pixAvailable:boolean}|null>(null);
 const [busy,setBusy]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState("");
 const returned=params.get("retorno");
 const sessionId=params.get("session_id")??"";
 const [paymentStatus,setPaymentStatus]=useState<"PROCESSING"|"CONFIRMED"|"CANCELED"|"UNAVAILABLE">("PROCESSING");
 useEffect(()=>{
  if(returned!=="sucesso"||!/^cs_(test|live)_[a-zA-Z0-9]{10,200}$/.test(sessionId))return;
  let active=true,tries=0;
  async function check(){
   try{
    const response=await fetch("/api/assinatura/status?session_id="+encodeURIComponent(sessionId),{cache:"no-store"});
    const value=await response.json() as {status?:string};
    if(active&&["PROCESSING","CONFIRMED","CANCELED","UNAVAILABLE"].includes(value.status??""))
     setPaymentStatus(value.status as typeof paymentStatus);
   }catch{if(active)setPaymentStatus("UNAVAILABLE");}
  }
  void check();
  const timer=setInterval(()=>{if(tries++<18)void check();else clearInterval(timer);},5000);
  return()=>{active=false;clearInterval(timer)};
 },[returned,sessionId]);
 useEffect(()=>{
  if(initialized.current)return;
  initialized.current=true;
  const value=params.get("token")??"";
  if(/^[A-Za-z0-9_-]{43}$/.test(value)){
   setToken(value);
   // A token is a credential: never leave it in browser history or Stripe Referrer.
   window.history.replaceState(window.history.state,"","/assinatura");
  }
 },[params]);
 useEffect(()=>{
  let active=true;
  fetch("/api/assinatura/disponibilidade",{cache:"no-store"})
   .then(r=>r.json()).then(data=>{if(active)setAvailability(data);})
   .catch(()=>{if(active)setAvailability({checkoutAvailable:false,pixAvailable:false});});
  return()=>{active=false};
 },[]);
 async function sendLink(event:React.FormEvent){
  event.preventDefault();setError("");setBusy(true);
  try{
   const response=await fetch("/api/assinatura/solicitar-link",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})
   });
   const data=await response.json() as {message?:string;error?:string};
   if(!response.ok)throw new Error(data.error??"Não foi possível solicitar o link.");
   setSent(true);
  }catch(e){setError(e instanceof Error?e.message:"Envio indisponível.");}
  finally{setBusy(false);}
 }
 async function checkout(event:React.FormEvent){
  event.preventDefault();setError("");setBusy(true);
  try{
   const response=await fetch("/api/assinatura/checkout",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({token,plan,method})
   });
   const data=await response.json() as {url?:string;error?:string};
   if(!response.ok)throw new Error(data.error??"Checkout indisponível.");
   if(!data.url?.startsWith("https://checkout.stripe.com/"))
    throw new Error("Destino do pagamento não validado.");
   window.location.assign(data.url);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível abrir o pagamento.");setBusy(false);}
 }
 return <main className="min-h-dvh bg-background px-4 py-10 text-foreground sm:py-14">
  <div className="mx-auto max-w-5xl space-y-8">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <span className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary"><ShieldCheck size={18}/> DUCHA ELITTE · ASSINATURAS</span>
    <Link className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/login"><ArrowLeft size={16}/> Voltar ao login</Link>
   </div>
   <header className="max-w-3xl space-y-3">
    <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Continue com seu lava-rápido</h1>
    <p className="text-sm leading-7 text-muted-foreground sm:text-base">Escolha um plano para manter sua operação e seus dados. O período gratuito não é renovado por um novo cadastro. Acesso liberado somente depois da confirmação do pagamento pela Stripe.</p>
   </header>
   {returned==="sucesso"&&<div role="status" className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm">
    {paymentStatus==="CONFIRMED"?"Pagamento confirmado e registrado no sistema. Sua licença foi atualizada. Você já pode tentar entrar no ERP.":
     paymentStatus==="CANCELED"?"Esta sessão não resultou em uma cobrança confirmada. Consulte o suporte antes de tentar novamente.":
     paymentStatus==="UNAVAILABLE"?"Não foi possível consultar a confirmação no momento. Verifique seu e-mail ou procure o suporte; não repita o pagamento.":
     "Retorno do checkout recebido. A Stripe está confirmando o pagamento. Essa página não libera acesso por si só. Não pague novamente enquanto a confirmação estiver pendente."}
   </div>}
   {returned==="cancelado"&&<div role="status" className="rounded-2xl border border-border bg-card p-4 text-sm">
    Você cancelou o checkout. Nenhum pagamento é confirmado apenas por abrir ou cancelar a página.
   </div>}
   <section className="grid gap-4 md:grid-cols-3" aria-label="Planos de assinatura">
    {offers.map(offer=><article key={offer.code} className={"space-y-3 rounded-2xl border bg-card p-5 sm:p-6 "+(plan===offer.code&&token?"border-primary shadow-sm":"border-border")}>
     <h2 className="font-bold">{offer.name}</h2>
     <p className="text-3xl font-black tracking-tight">{offer.price}</p>
     <p className="text-xs font-semibold text-primary">{offer.period}</p>
     <p className="text-sm leading-6 text-muted-foreground">{offer.description}</p>
     {token&&<button type="button" aria-pressed={plan===offer.code}
      onClick={()=>{setPlan(offer.code);setMethod("CARD")}}
      className={"inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold "+(plan===offer.code?"border-primary bg-primary text-primary-foreground":"border-border hover:bg-muted")}>
      {plan===offer.code?<Check size={16}/>:null}{plan===offer.code?"Selecionado":"Escolher este plano"}
     </button>}
    </article>)}
   </section>
   <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
    {availability===null?<p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin"/> Verificando disponibilidade...</p>:
    !availability.checkoutAvailable?<>
     <h2 className="text-lg font-bold">Pagamentos temporariamente em homologação</h2>
     <p className="mt-2 text-sm leading-6 text-muted-foreground">O checkout da Stripe ainda não está liberado neste ambiente. Não solicitamos dados de cartão fora da Stripe e não faremos uma cobrança sem confirmação.</p>
     <a className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground"
      href="mailto:plataforma@duchaelitte.com.br?subject=Assinatura%20Ducha%20Elitte"><Mail size={17}/> Solicitar regularização</a>
    </>:token?<>
     <div className="flex items-center gap-2"><LockKeyhole size={20} className="text-primary"/><h2 className="text-xl font-bold">Escolha como pagar</h2></div>
     <p className="mt-2 text-sm leading-6 text-muted-foreground">Seu e-mail foi confirmado pelo link de uso único. A cobrança só começa quando você concluir o Checkout seguro da Stripe.</p>
     <form onSubmit={checkout} className="mt-5 space-y-4">
      <fieldset className="space-y-2"><legend className="mb-2 font-semibold">Forma de pagamento</legend>
       <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border px-4 text-sm">
        <input type="radio" checked={method==="CARD"} onChange={()=>setMethod("CARD")} name="method"/>
        <CreditCard size={18}/> Cartão de crédito {plan==="ANUAL_AVISTA"?"(1x)":"(recorrente)"}
       </label>
       {plan==="ANUAL_AVISTA" && availability.pixAvailable&&
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border px-4 text-sm">
         <input type="radio" checked={method==="PIX"} onChange={()=>setMethod("PIX")} name="method"/>
         Pix à vista · R$ 790
        </label>}
      </fieldset>
      <button disabled={busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-primary-foreground disabled:opacity-50">
       {busy?<Loader2 size={18} className="animate-spin"/>:<LockKeyhole size={18}/>}
       {busy?"Preparando checkout...":"Ir para pagamento seguro"}
      </button>
      <p className="text-xs leading-5 text-muted-foreground">Ao prosseguir, você verá o valor e a periodicidade na Stripe antes de autorizar. Não envie dados de cartão pelo WhatsApp ou e-mail.</p>
     </form>
    </>:<>
     <h2 className="flex items-center gap-2 text-xl font-bold"><Mail size={20} className="text-primary"/> Receber link de pagamento</h2>
     {sent?<div role="status" className="mt-4 rounded-xl border border-border bg-muted/30 p-4 text-sm leading-6">Se este e-mail pertencer a uma conta elegível, enviaremos um link individual. Verifique sua caixa de entrada e o spam. Ele é válido por 20 minutos.</div>:
     <form onSubmit={sendLink} className="mt-5 max-w-lg space-y-3">
      <label htmlFor="billing-email" className="block text-sm font-semibold">E-mail do proprietário cadastrado</label>
      <input id="billing-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}
       placeholder="proprietario@empresa.com.br" className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base"/>
      <button disabled={busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground disabled:opacity-50">
       {busy?<Loader2 size={18} className="animate-spin"/>:<Mail size={18}/>}
       {busy?"Solicitando...":"Enviar meu link seguro"}
      </button>
      <p className="text-xs leading-5 text-muted-foreground">Para sua segurança, somente o endereço confirmado do proprietário poderá receber o link. Nenhum pagamento será iniciado com o envio.</p>
     </form>}
    </>}
    {error&&<p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
   </section>
   <footer className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
    <ShieldCheck size={17}/> Pagamento processado pela Stripe, sem armazenar cartão na Ducha Elitte.
    <Clock3 size={17}/> Testes encerrados não são reiniciados.
   </footer>
  </div>
 </main>;
}
export default function AssinaturaPage(){
 return <Suspense fallback={<main className="min-h-dvh bg-background p-10 text-muted-foreground">Carregando planos...</main>}><PaymentPortal/></Suspense>;
}
