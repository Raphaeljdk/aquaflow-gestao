"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, CarFront, CheckCircle2, Clock3, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { whatsappLink } from "@/lib/whatsapp";

type PublicBusiness = {
  empresa: string; logo: string | null; whatsapp: string | null; disponivel: boolean;
  abertura: string; fechamento: string; diasSemana: number[]; intervaloMin: number;
  servicos: Array<{ id: string; nome: string; duracaoMin: number }>;
};
export default function EmpresaAgendamento() {
  const [business,setBusiness]=useState<PublicBusiness|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [nome,setNome]=useState("");
  const [telefone,setTelefone]=useState("");
  const [placa,setPlaca]=useState("");
  const [aceitePrivacidade,setAceitePrivacidade]=useState(false);
  const [enviando,setEnviando]=useState(false);
  const [enviado,setEnviado]=useState(false);
  const [tipo,setTipo]=useState("CARRO");
  const [veiculo,setVeiculo]=useState("");
  const [servicoId,setServicoId]=useState("");
  const [data,setData]=useState("");
  const [horario,setHorario]=useState("");
  const [observacoes,setObservacoes]=useState("");
  const today = useMemo(() => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const p = (t: string) => parts.find(v => v.type === t)?.value ?? "";
    return p("year")+"-"+p("month")+"-"+p("day");
  }, []);
  useEffect(() => {
    const controller=new AbortController();
    fetch("/api/public/empresa",{cache:"no-store",signal:controller.signal})
      .then(async r=>{if(!r.ok)throw new Error("Página temporariamente indisponível.");return r.json() as Promise<PublicBusiness>})
      .then(setBusiness)
      .catch(e=>{if(e instanceof Error && e.name==="AbortError")return;setError("Não foi possível consultar os dados do estabelecimento.")})
      .finally(()=>setLoading(false));
    return ()=>controller.abort();
  },[]);
  const service=business?.servicos.find(s=>s.id===servicoId);
  const dateIsOpen= data ? business?.diasSemana.includes(new Date(data+"T12:00:00Z").getUTCDay()) ?? false : true;
  const minTime=business?.abertura??"08:00", maxTime=business?.fechamento??"18:00";
  const enoughTime=service && horario
    ? (Number(horario.slice(0,2))*60+Number(horario.slice(3)))+service.duracaoMin <= Number(maxTime.slice(0,2))*60+Number(maxTime.slice(3))
    : false;
  async function enviar(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(enviando || !business || !service || !dateIsOpen || !enoughTime || data<today || horario<minTime || !aceitePrivacidade) {
      setError("Confira o cadastro e selecione um horário válido dentro do expediente.");
      return;
    }
    setEnviando(true);setError("");
    try {
      const response = await fetch("/api/public/empresa/agendamentos", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({nome,telefone,tipo,placa,descricaoVeiculo:veiculo,servicoId,data,
          horario,observacoes,aceitePrivacidade}),
      });
      const result = await response.json() as {error?:string};
      if(!response.ok) throw new Error(result.error || "Não foi possível registrar o pedido.");
      setEnviado(true);
    } catch(e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar o pedido. Confira seus dados e tente novamente.");
    } finally {setEnviando(false);}
  }
  const whatsappMsg = business && service
    ? "Olá! Enviei um pedido de agendamento para " + business.empresa + " em " +
      data.split("-").reverse().join("/") + " às " + horario + ". Nome: " + nome.trim() +
      ". Placa: " + placa.trim().toUpperCase() + ". Podem confirmar a disponibilidade?"
    : "";
  const whatsappUrl = whatsappLink(business?.whatsapp,whatsappMsg);
  const field="h-12 w-full min-w-0 rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return <main className="min-h-dvh bg-background text-foreground">
    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6">
      <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16}/> Voltar ao sistema</Link>
      <div className="mx-auto mt-10 grid items-start gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:gap-12">
        <section className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-2 text-xs font-bold uppercase tracking-widest"><CalendarDays size={16} className="text-primary"/> Solicitar lavagem</span>
          {business?.logo && <img src={business.logo} width={88} height={88} alt={"Logo "+business.empresa} className="size-20 rounded-2xl bg-white object-contain p-1" />}
          <h1 className="text-4xl font-black leading-[1.08] tracking-tight">{business?.empresa??"Agende sua lavagem"}</h1>
          <p className="text-sm leading-7 text-muted-foreground">Selecione o serviço, informe seu carro ou moto e envie sua preferência diretamente para a equipe do estabelecimento.</p>
          <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground"><ShieldCheck size={17} className="mt-1 shrink-0"/> O pedido é registrado para análise da equipe. O horário só vira reserva depois da confirmação; os dados informados são utilizados para atendimento.</p>
        </section>
        <section className="rounded-3xl border border-border bg-card p-4 shadow-lg sm:p-7">
          <h2 className="mb-2 flex items-center gap-2 text-xl font-bold"><Clock3 className="text-primary"/> Escolher horário</h2>
          {loading ? <p role="status" className="flex gap-2 py-6 text-sm"><Loader2 size={16} className="animate-spin"/> Carregando configurações...</p> :
            !business ? <p role="status" className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              {error || "Os dados do estabelecimento ainda não estão disponíveis."}
            </p> :
            !business.servicos.length ? <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">O estabelecimento ainda não cadastrou serviços. Entre em contato com a equipe.</p> :
            enviado ? <div role="status" className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <CheckCircle2 size={34} className="text-emerald-500" />
              <h3 className="text-lg font-bold">Pedido registrado!</h3>
              <p className="text-sm leading-6">A equipe recebeu sua solicitação e poderá confirmar ou recusar o horário na agenda do lava-rápido. Até lá, o horário não está reservado.</p>
              {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                <MessageCircle size={18}/> Acompanhar pelo WhatsApp
              </a>}
            </div> :
            <form onSubmit={enviar} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold">Seu nome
                  <input required minLength={2} maxLength={100} className={field} value={nome} onChange={e=>setNome(e.target.value)} placeholder="Nome" />
                </label>
                <label className="space-y-2 text-sm font-semibold">WhatsApp com DDD
                  <input required inputMode="tel" minLength={10} maxLength={20} className={field} value={telefone} onChange={e=>setTelefone(e.target.value)} placeholder="(11) 99999-9999"/>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold">Tipo de veículo
                  <select className={field} value={tipo} onChange={e=>setTipo(e.target.value)}>
                    <option value="CARRO">Carro</option><option value="MOTO">Moto</option><option value="CAMINHONETE">Caminhonete</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-semibold">Modelo / identificação
                  <input required minLength={2} maxLength={100} className={field} value={veiculo} onChange={e=>setVeiculo(e.target.value)} placeholder={tipo==="MOTO"?"Ex.: CG 160":"Ex.: Onix preto"} />
                </label>
              </div>
              <label className="block space-y-2 text-sm font-semibold">Placa do veículo
                <input required minLength={7} maxLength={8} className={field+" uppercase"} value={placa} onChange={e=>setPlaca(e.target.value.toUpperCase())} placeholder="ABC1D23" autoCapitalize="characters"/>
                <span className="block text-xs font-normal text-muted-foreground">A placa permite relacionar o pedido à agenda, sem criar cadastro antes da aprovação.</span>
              </label>
              <label className="block space-y-2 text-sm font-semibold">Lavagem ou serviço
                <select required className={field} value={servicoId} onChange={e=>setServicoId(e.target.value)}>
                  <option value="">Selecione um serviço cadastrado</option>
                  {business.servicos.map(s=><option key={s.id} value={s.id}>{s.nome} · {s.duracaoMin} min</option>)}
                </select>
              </label>
              <p className="text-xs text-muted-foreground">Serviços para carro e moto devem ser cadastrados pelo proprietário em Gestão → Serviços.</p>
              <p className="rounded-xl bg-muted/50 p-3 text-xs">Funcionamento: {business.abertura} às {business.fechamento}. Horário sujeito a disponibilidade e confirmação.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold">Data desejada
                  <input required type="date" min={today} className={field} value={data} onChange={e=>setData(e.target.value)} />
                </label>
                <label className="space-y-2 text-sm font-semibold">Horário preferido
                  <input required type="time" min={minTime} max={maxTime} className={field} value={horario} onChange={e=>setHorario(e.target.value)} />
                </label>
              </div>
              {data && !dateIsOpen && <p role="alert" className="text-xs text-destructive">Este lava-rápido não atende no dia da semana escolhido.</p>}
              {horario && service && !enoughTime && <p role="alert" className="text-xs text-destructive">O serviço não cabe antes do fechamento. Escolha um horário mais cedo.</p>}
              <label className="block space-y-2 text-sm font-semibold">Observações (opcional)
                <textarea maxLength={400} rows={3} value={observacoes} onChange={e=>setObservacoes(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Detalhes para a equipe"/>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-3 text-xs leading-5">
                <input required type="checkbox" checked={aceitePrivacidade} onChange={e=>setAceitePrivacidade(e.target.checked)} className="mt-1 size-4 accent-yellow-400"/>
                <span>Autorizo o uso de nome, WhatsApp, veículo e preferência de horário para analisar meu pedido de agendamento.</span>
              </label>
              {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
              <button disabled={enviando||!aceitePrivacidade||!dateIsOpen||!enoughTime||!service} type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
                {enviando ? <Loader2 size={18} className="animate-spin"/> : <CalendarDays size={18}/>} {enviando ? "Enviando pedido..." : "Solicitar agendamento"}
              </button>
              <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><CheckCircle2 size={15} className="mt-0.5 shrink-0"/> Seu pedido será salvo como pendente na agenda da empresa e só será confirmado após a análise da equipe.</p>
            </form>}
        </section>
      </div>
    </div>
  </main>;
}
