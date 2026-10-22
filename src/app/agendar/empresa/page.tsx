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
  function enviar(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!business?.disponivel||!service||!dataIsOpen||!enoughTime||data<today||horario<minTime){
      setError("Escolha um horário dentro do funcionamento e um serviço disponível.");
      return;
    }
    setError("");
    const message = [
      "Olá! Gostaria de solicitar um horário para lavagem.",
      "Estabelecimento: "+business.empresa,
      "Cliente: "+nome.trim(), "Contato: "+telefone.trim(),
      "Veículo: "+(tipo==="MOTO"?"Moto":tipo==="CAMINHONETE"?"Caminhonete":"Carro")+" · "+veiculo.trim(),
      "Serviço: "+service.nome,
      "Data desejada: "+data.split("-").reverse().join("/"),
      "Horário: "+horario,
      observacoes.trim()?"Observações: "+observacoes.trim():"",
      "Podem confirmar a disponibilidade e o valor?"
    ].filter(Boolean).join("\n");
    const url=whatsappLink(business.whatsapp,message);
    if(url)window.location.assign(url);
  }
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
          <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground"><ShieldCheck size={17} className="mt-1 shrink-0"/> O pedido abre uma conversa no WhatsApp. Ele não cria uma reserva confirmada e não grava dados do veículo no sistema.</p>
        </section>
        <section className="rounded-3xl border border-border bg-card p-4 shadow-lg sm:p-7">
          <h2 className="mb-2 flex items-center gap-2 text-xl font-bold"><Clock3 className="text-primary"/> Escolher horário</h2>
          {loading ? <p role="status" className="flex gap-2 py-6 text-sm"><Loader2 size={16} className="animate-spin"/> Carregando configurações...</p> :
            !business?.disponivel ? <p role="status" className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              {error || "O WhatsApp de agendamentos ainda não está configurado por este lava-rápido."}
            </p> :
            !business.servicos.length ? <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">O estabelecimento ainda não cadastrou serviços. Entre em contato com a equipe.</p> :
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
              {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
              <button disabled={!dateIsOpen||!enoughTime||!service} type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
                <MessageCircle size={18}/> Solicitar pelo WhatsApp
              </button>
              <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><CheckCircle2 size={15} className="mt-0.5 shrink-0"/> Sua preferência será encaminhada à equipe. Aguarde confirmação de disponibilidade.</p>
            </form>}
        </section>
      </div>
    </div>
  </main>;
}
