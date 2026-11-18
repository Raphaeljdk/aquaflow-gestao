"use client";
import {useCallback,useEffect,useState,type FormEvent} from "react";
import {Copy,Link2,Loader2,Plus,Users} from "lucide-react";

type Partner={id:string;name:string;code:string;active:boolean;central:number;legacy:number;total:number;inTrial:number;paying:number};
const referralLink=(code:string)=>
 "https://www.duchaelitte.com.br/cadastrar-lava-rapido?modalidade=teste&indicacao="+encodeURIComponent(code);

/** Existing Gestao > Empresas section. No separate tab or public partner dashboard. */
export function SalesReferralManager(){
 const [partners,setPartners]=useState<Partner[]>([]);
 const [name,setName]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const load=useCallback(async()=>{
  try{
   const response=await fetch("/api/plataforma/saas/indicadores",{cache:"no-store"});
   const body=await response.json() as {partners?:Partner[];error?:string};
   if(!response.ok)throw new Error(body.error??"Não foi possível consultar as indicações.");
   setPartners(body.partners??[]);
  }catch(e){setError(e instanceof Error?e.message:"Falha na consulta.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function create(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(saving||name.trim().length<3)return;
  setSaving(true);setError("");setNotice("");
  try{
   const response=await fetch("/api/plataforma/saas/indicadores",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name.trim()})
   });
   const body=await response.json() as {partner?:Partner;error?:string};
   if(!response.ok||!body.partner)throw new Error(body.error??"Não foi possível cadastrar o parceiro.");
   setName("");setNotice("Link de indicação criado. Copie e envie ao parceiro.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Erro ao gerar link.");}
  finally{setSaving(false);}
 }
 async function copy(code:string){
  try{await navigator.clipboard.writeText(referralLink(code));setNotice("Link copiado. O lava-rápido terá 7 dias grátis após a ativação.");setError("");}
  catch{setError("Não foi possível copiar automaticamente. Selecione o endereço exibido abaixo.");}
 }
 return <section aria-label="Indicações comerciais" className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div>
    <h2 className="flex items-center gap-2 text-base font-bold"><Users size={18}/> Indicações de lava-rápidos</h2>
    <p className="mt-1 text-xs text-muted-foreground">Cadastre um parceiro e copie o link. O cadastro indica a origem, sem antecipar o teste nem criar cobrança.</p>
   </div>
   <form onSubmit={create} className="flex w-full flex-wrap gap-2 sm:w-auto">
    <input aria-label="Nome do parceiro comercial" placeholder="Nome do parceiro ou loja" required minLength={3} maxLength={90}
     value={name} onChange={e=>setName(e.target.value)}
     className="min-h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm sm:w-56"/>
    <button type="submit" disabled={saving||name.trim().length<3}
     className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
     {saving?<Loader2 size={15} className="animate-spin"/>:<Plus size={15}/>} Gerar link
    </button>
   </form>
  </div>
  {error&&<p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
  {notice&&<p role="status" className="rounded-lg bg-muted p-3 text-sm">{notice}</p>}
  {loading?<p className="text-sm text-muted-foreground">Carregando parceiros...</p>:
   partners.length===0?<p className="text-sm text-muted-foreground">Nenhum parceiro comercial cadastrado ainda.</p>:
   <div className="space-y-2">{partners.map(partner=><div key={partner.id} className="rounded-xl border border-border p-3">
     <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
       <p className="text-sm font-bold">{partner.name}</p>
       <p className="mt-1 text-xs text-muted-foreground">{partner.total} cadastro(s) indicado(s) · {partner.inTrial} em teste · {partner.paying} assinatura(s) ativa(s)</p>
      </div>
      <button type="button" onClick={()=>void copy(partner.code)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold"><Copy size={14}/> Copiar link</button>
     </div>
     <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Link2 size={14}/>
      <input aria-label={"Link de indicação de "+partner.name} readOnly value={referralLink(partner.code)} onFocus={e=>e.currentTarget.select()}
       className="min-w-0 flex-1 overflow-hidden rounded-md bg-muted/50 px-2 py-1 font-mono text-xs text-foreground"/>
     </label>
    </div>)}</div>}
 </section>;
}
