"use client";
import { BookOpen, ExternalLink, FileText, LifeBuoy, PlayCircle, ShieldCheck } from "lucide-react";
import { useStore } from "@/hooks/use-store";

const modulos = [
  { titulo: "Visão geral", texto: "Veja indicadores e o resumo da operação do dia." },
  { titulo: "Clientes", texto: "Pesquise clientes e consulte veículos e histórico." },
  { titulo: "Comandas", texto: "Receba veículos, selecione serviços, faça a vistoria e finalize o atendimento." },
  { titulo: "Agendamentos", texto: "Organize horários e confirme ou recuse pedidos recebidos online." },
  { titulo: "Estoque", texto: "Controle materiais e suas movimentações." },
  { titulo: "Serviços", texto: "Cadastre lavagens, preços, duração e disponibilidade." },
  { titulo: "Funcionários", texto: "Gerencie os integrantes da equipe e suas permissões." },
  { titulo: "Faturamento", texto: "Acompanhe totais e recebimentos registrados nas comandas." },
  { titulo: "Configurações", texto: "Altere a logo interna, os dados da empresa e os horários." },
  { titulo: "Como usar", texto: "Acesse este guia e os materiais de treinamento." },
  { titulo: "Suporte e chamados", texto: "Abra um chamado, descreva o problema e acompanhe as respostas da gestão da plataforma." },
];
const etapas = [
  { titulo: "Receber um veículo", texto: "Abra uma nova comanda, escolha carro ou moto e informe o cliente e os serviços." },
  { titulo: "Fazer a vistoria", texto: "Abra a comanda e marque os pontos sem avaria ou com avaria antes de iniciar a lavagem." },
  { titulo: "Organizar a agenda", texto: "Confira os horários configurados e registre os agendamentos após confirmação com o cliente." },
  { titulo: "Fechar a comanda", texto: "Confira o total, registre a forma de pagamento e finalize o atendimento." },
];
export default function ComoUsarPage() {
  const { data, user } = useStore();
  const video = data?.configuracao.manualVideoUrl ?? "";
  const pdf = data?.configuracao.manualPdfUrl || "/api/manual";
  const videoId = video.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)?.[1];
  const descriptId = video.match(/^https:\/\/share\.descript\.com\/view\/([a-zA-Z0-9]+)(?:[/?#]|$)/)?.[1];
  return <main className="mx-auto max-w-5xl space-y-8 p-4 sm:p-8">
    <header className="space-y-3">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><BookOpen size={16}/> Central de ajuda</p>
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Como usar o sistema</h1>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Treinamento rápido para trabalhar com comandas, vistorias e agendamentos sem complicação.</p>
    </header>
    <section className="space-y-5 rounded-2xl border border-primary/30 bg-card p-4 sm:p-6" aria-label="Vídeos oficiais de treinamento da Ducha Elitte">
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-xl font-bold"><PlayCircle size={22} className="text-primary"/> Treinamento Ducha Elitte</h2>
        <p className="text-sm leading-6 text-muted-foreground">Assista aos vídeos com narração humanizada para conhecer as abas do sistema, realizar atendimentos e solicitar suporte.</p>
      </div>
      <article className="space-y-3">
        <div>
          <h3 className="font-semibold">Comece aqui — Guia rápido (32 segundos)</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Uma apresentação prática de visão geral, clientes, comandas, agenda, estoque, serviços, funcionários, faturamento e suporte.</p>
        </div>
        <video controls playsInline preload="metadata" className="aspect-video w-full rounded-xl border border-border bg-black"
          src="https://zbpfvd9tctfhm3g8.public.blob.vercel-storage.com/ducha-elitte/treinamento/ducha_elitte_guia_rapido_todas_abas.mp4"
          aria-label="Guia rápido Ducha Elitte com narração profissional em português brasileiro">
          Seu navegador não suporta reprodução de vídeos.
        </video>
      </article>
      <article className="space-y-3 border-t border-border pt-5">
        <div>
          <h3 className="font-semibold">Treinamento completo (1 minuto e 48 segundos)</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Explica com mais detalhes cada aba, o fluxo de atendimento e como abrir e acompanhar chamados.</p>
        </div>
        <video controls playsInline preload="metadata" className="aspect-video w-full rounded-xl border border-border bg-black"
          src="https://zbpfvd9tctfhm3g8.public.blob.vercel-storage.com/ducha-elitte/treinamento/ducha_elitte_treinamento_abas_suporte_chamados.mp4"
          aria-label="Treinamento completo Ducha Elitte com narração profissional em português brasileiro">
          Seu navegador não suporta reprodução de vídeos.
        </video>
      </article>
    </section>
    <div className="grid gap-4 md:grid-cols-2">
      <section className="min-w-0 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><PlayCircle size={20} className="text-primary"/> Vídeo adicional do estabelecimento</h2>
        {video ? <div className="space-y-3">
          {videoId ? <iframe title="Vídeo: como usar o sistema" src={"https://www.youtube-nocookie.com/embed/" + videoId}
            loading="lazy" allowFullScreen className="aspect-video w-full rounded-xl border border-border" referrerPolicy="strict-origin-when-cross-origin" /> : descriptId
            ? <iframe title="Treinamento Ducha Elitte no Descript" src={"https://share.descript.com/embed/" + descriptId}
                loading="lazy" allowFullScreen className="aspect-video w-full rounded-xl border border-border"
                referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; fullscreen" />
            : null}
          <a href={video} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4">
            <ExternalLink size={16}/> Abrir vídeo completo
          </a>
        </div> :
          <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">Sem vídeo adicional configurado. O administrador pode adicionar um link em Configurações → Como usar.</p>}
      </section>
      <section className="min-w-0 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><FileText size={20} className="text-primary"/> Manual em PDF</h2>
        <a href={pdf} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground">
          <FileText size={18}/> Abrir manual em PDF <ExternalLink size={15}/>
        </a>
        <p className="mt-3 text-xs text-muted-foreground">Manual gratuito incorporado ao Ducha Elitte. O administrador pode substituir pelo manual próprio do estabelecimento.</p>
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck size={15} className="shrink-0"/> Consulte os procedimentos antes de alterar configurações ou concluir pagamentos.</p>
      </section>
    </div>
    <section className="space-y-4">
      <h2 className="text-xl font-bold">O que faz cada aba do sistema</h2>
      <div className="grid gap-3 sm:grid-cols-2">{modulos.map((item, i)=>
        <article key={item.titulo} className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-bold"><span className="mr-2 text-primary">{String(i+1).padStart(2,"0")}</span>{item.titulo}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.texto}</p>
        </article>
      )}</div>
    </section>
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Fluxo básico de atendimento</h2>
      <div className="grid gap-3 sm:grid-cols-2">{etapas.map((etapa, i)=><article key={etapa.titulo} className="rounded-2xl border border-border bg-card p-5">
        <span className="mb-3 inline-flex size-9 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">{i+1}</span>
        <h3 className="font-bold">{etapa.titulo}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{etapa.texto}</p>
      </article>)}</div>
    </section>
    <a href="/suporte" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"><LifeBuoy size={17} className="text-primary"/> Precisa de ajuda? Abrir suporte e chamados <ExternalLink size={14}/></a>
    {user?.role==="ADMIN" && <p className="text-xs text-muted-foreground">Para trocar materiais adicionais, acesse Configurações → Como usar, informe os links HTTPS e salve.</p>}
  </main>;
}
