"use client";

import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  FileText,
  LifeBuoy,
  LayoutDashboard,
  Package,
  PlayCircle,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRoundCog,
  UsersRound,
  Wrench,
} from "lucide-react";
import { useStore } from "@/hooks/use-store";

const baseVideoUrl =
  "https://zbpfvd9tctfhm3g8.public.blob.vercel-storage.com/ducha-elitte/treinamento/";

const modulos = [
  { titulo: "Visão geral", texto: "Acompanhe indicadores, fila de veículos e resumo da operação.", icone: LayoutDashboard },
  { titulo: "Clientes", texto: "Consulte contatos, veículos relacionados e histórico.", icone: UsersRound },
  { titulo: "Comandas", texto: "Abra atendimentos, registre vistorias e finalize serviços.", icone: ClipboardList },
  { titulo: "Agendamentos", texto: "Organize horários e confirme os pedidos recebidos.", icone: CalendarDays },
  { titulo: "Estoque", texto: "Acompanhe materiais, entradas e movimentações.", icone: Package },
  { titulo: "Serviços", texto: "Defina lavagens, preços, duração e disponibilidade.", icone: Wrench },
  { titulo: "Funcionários", texto: "Gerencie a equipe e as permissões de acesso.", icone: UserRoundCog },
  { titulo: "Faturamento", texto: "Visualize os recebimentos e resultados registrados.", icone: ChartNoAxesCombined },
  { titulo: "Configurações", texto: "Ajuste dados do estabelecimento, marca e horários.", icone: Settings2 },
  { titulo: "Como usar", texto: "Encontre treinamentos e orientações da plataforma.", icone: BookOpen },
  { titulo: "Suporte e chamados", texto: "Abra solicitações e acompanhe as respostas.", icone: LifeBuoy },
];

const etapas = [
  { titulo: "Receba o veículo", texto: "Abra uma comanda e informe o cliente, o carro ou a moto." },
  { titulo: "Faça a vistoria", texto: "Registre as condições do veículo antes do serviço." },
  { titulo: "Acompanhe o serviço", texto: "Consulte o andamento e organize os horários da equipe." },
  { titulo: "Finalize a comanda", texto: "Confira os valores, o pagamento e conclua o atendimento." },
];

const botaoBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default function ComoUsarPage() {
  const { data, user } = useStore();
  const video = data?.configuracao.manualVideoUrl ?? "";
  const pdf = data?.configuracao.manualPdfUrl || "/api/manual";
  const videoId = video.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)?.[1];
  const descriptId = video.match(/^https:\/\/share\.descript\.com\/view\/([a-zA-Z0-9]+)(?:[/?#]|$)/)?.[1];

  return (
    <main className="mx-auto w-full max-w-[1480px] space-y-8 px-4 pb-12 pt-5 sm:px-6 sm:pt-7 lg:px-8">
      <header className="relative isolate overflow-hidden rounded-3xl border border-border bg-card px-5 py-7 shadow-sm sm:px-8 sm:py-9 lg:px-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-44 -z-10 size-[380px] rounded-full bg-primary/10 blur-[90px]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
              <BookOpen size={14} className="text-primary" /> Central de ajuda · Ducha Elitte
            </p>
            <div className="space-y-3">
              <h1 className="text-balance text-3xl font-black leading-[1.13] tracking-tight sm:text-4xl lg:text-[44px]">
                Aprenda a usar a <span className="text-primary">Ducha Elitte.</span>
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Tudo o que sua equipe precisa para atender veículos, organizar a agenda e acompanhar o lava-rápido — com vídeos curtos, manual e suporte no mesmo lugar.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={15} className="text-primary" /> Treinamento em português</span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1.5"><Clock3 size={15} className="text-primary" /> Comece em 32 segundos</span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-primary" /> Orientações oficiais</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
            <a href="#treinamentos" className={botaoBase + " bg-primary text-primary-foreground hover:bg-primary/90"}>
              <PlayCircle size={17} /> Assistir aos vídeos <ArrowRight size={16} />
            </a>
            <a href="#modulos" className={botaoBase + " border border-border bg-background text-foreground hover:bg-muted"}>
              <LayoutDashboard size={16} /> Conhecer as abas
            </a>
          </div>
        </div>
      </header>

      <section id="treinamentos" className="scroll-mt-24 space-y-5" aria-label="Vídeos oficiais de treinamento da Ducha Elitte">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-primary">Treinamento Ducha Elitte</p>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Escolha como quer aprender</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Dois vídeos com narração humanizada. Comece pelo resumo ou veja a explicação completa de cada aba.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
            <PlayCircle size={14} className="text-primary" /> 2 vídeos disponíveis
          </span>
        </div>

        <div className="grid items-stretch gap-5 lg:grid-cols-2">
          <article className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-primary/40 bg-card shadow-sm">
            <div className="flex flex-1 flex-col gap-3 p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-bold text-foreground">
                  <Sparkles size={14} className="text-primary" /> Recomendado para começar
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Clock3 size={14} /> 00:32</span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold tracking-tight">Guia rápido (32 segundos)</h3>
                <p className="min-h-12 text-sm leading-6 text-muted-foreground">
                  Uma visão direta das principais funções: atendimentos, comandas, agendamentos, estoque, equipe e suporte.
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border bg-black">
                <video
                  controls playsInline preload="metadata"
                  className="aspect-video w-full bg-black object-contain"
                  src={baseVideoUrl + "ducha_elitte_guia_rapido_todas_abas.mp4"}
                  aria-label="Guia rápido Ducha Elitte com narração profissional em português brasileiro">
                  Seu navegador não suporta reprodução de vídeos.
                </video>
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 size={15} className="shrink-0 text-primary" /> Ideal para novos funcionários e revisões rápidas.
              </p>
            </div>
          </article>

          <article className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="flex flex-1 flex-col gap-3 p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground">
                  <BookOpen size={14} className="text-primary" /> Passo a passo
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Clock3 size={14} /> 01:48</span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold tracking-tight">Treinamento completo (1 minuto e 48 segundos)</h3>
                <p className="min-h-12 text-sm leading-6 text-muted-foreground">
                  Entenda o fluxo de atendimento, a vistoria, as abas de gestão e como abrir e acompanhar chamados.
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border bg-black">
                <video
                  controls playsInline preload="metadata"
                  className="aspect-video w-full bg-black object-contain"
                  src={baseVideoUrl + "ducha_elitte_treinamento_abas_suporte_chamados.mp4"}
                  aria-label="Treinamento completo Ducha Elitte com narração profissional em português brasileiro">
                  Seu navegador não suporta reprodução de vídeos.
                </video>
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 size={15} className="shrink-0 text-primary" /> Ideal para aprender as funções com mais detalhes.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section aria-label="Materiais e suporte" className="grid gap-4 md:grid-cols-2">
        <article className="flex min-w-0 flex-col justify-between gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><FileText size={22} /></span>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold">Manual em PDF</h2>
              <p className="text-sm leading-6 text-muted-foreground">Consulte os procedimentos com calma, sempre que tiver alguma dúvida sobre o sistema.</p>
            </div>
          </div>
          <a href={pdf} target="_blank" rel="noopener noreferrer"
            className={botaoBase + " w-full border border-border bg-background hover:bg-muted sm:w-fit"}>
            <FileText size={17} /> Abrir manual em PDF <ExternalLink size={15} />
          </a>
        </article>
        <article className="flex min-w-0 flex-col justify-between gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><LifeBuoy size={22} /></span>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold">Suporte e chamados</h2>
              <p className="text-sm leading-6 text-muted-foreground">Encontrou um problema? Abra um chamado, descreva a situação e acompanhe as respostas.</p>
            </div>
          </div>
          <a href="/suporte" className={botaoBase + " w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-fit"}>
            <LifeBuoy size={17} /> Abrir suporte e chamados <ArrowRight size={15} />
          </a>
        </article>
      </section>

      {video && (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-label="Treinamento adicional do estabelecimento">
          <div className="mb-4 space-y-1.5">
            <h2 className="flex items-center gap-2 text-lg font-bold"><PlayCircle size={20} className="text-primary" /> Vídeo adicional do estabelecimento</h2>
            <p className="text-sm text-muted-foreground">Material complementar configurado pelo responsável do lava-rápido.</p>
          </div>
          <div className="max-w-2xl space-y-3">
            {videoId ? (
              <iframe title="Vídeo: como usar o sistema"
                src={"https://www.youtube-nocookie.com/embed/" + videoId}
                loading="lazy" allowFullScreen
                className="aspect-video w-full rounded-xl border border-border bg-black"
                referrerPolicy="strict-origin-when-cross-origin" />
            ) : descriptId ? (
              <iframe title="Treinamento adicional Ducha Elitte no Descript"
                src={"https://share.descript.com/embed/" + descriptId}
                loading="lazy" allowFullScreen
                className="aspect-video w-full rounded-xl border border-border bg-black"
                referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; fullscreen" />
            ) : null}
            <a href={video} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4">
              <ExternalLink size={16} /> Abrir vídeo adicional
            </a>
          </div>
        </section>
      )}

      <section id="modulos" className="scroll-mt-24 space-y-5">
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-primary">Guia de funções</p>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">O que faz cada aba do sistema</h2>
          <p className="text-sm leading-6 text-muted-foreground">Consulte rapidamente a finalidade de cada área da Ducha Elitte.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {modulos.map((item) => (
            <article key={item.titulo}
              className="flex min-w-0 items-start gap-3.5 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/50 sm:p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <item.icone size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0 space-y-1">
                <h3 className="text-sm font-bold sm:text-base">{item.titulo}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{item.texto}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="fluxo" className="scroll-mt-24 space-y-5">
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-primary">Na prática</p>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Do veículo à entrega, em 4 etapas</h2>
          <p className="text-sm leading-6 text-muted-foreground">Um resumo do fluxo básico de atendimento dentro do ERP.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {etapas.map((etapa, i) => (
            <article key={etapa.titulo} className="rounded-2xl border border-border bg-card p-5">
              <span className="mb-4 grid size-10 place-items-center rounded-xl bg-primary/15 text-sm font-extrabold text-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-bold">{etapa.titulo}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{etapa.texto}</p>
            </article>
          ))}
        </div>
      </section>

      {user?.role === "ADMIN" && (
        <p className="rounded-xl border border-border bg-card p-4 text-xs leading-5 text-muted-foreground">
          Administrador: para trocar materiais adicionais, acesse Configurações → Como usar, informe os links HTTPS e salve. Os dois treinamentos oficiais continuam disponíveis para a equipe.
        </p>
      )}
    </main>
  );
}
