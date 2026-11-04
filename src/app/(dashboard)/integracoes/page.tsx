import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import {
  listDistributionChannels, type DistributionChannel, type ChannelPhase,
} from "@/lib/integrations/catalog";

export const metadata: Metadata = {
  title: "Aplicativos e maquininhas | AquaFlow",
};

const phaseLabels: Record<ChannelPhase, string> = {
  BASE_CRIADA: "Base criada",
  AGUARDANDO_PARCEIRO: "Aguardando parceiro",
  PLANEJADO: "Planejado",
};

function ChannelCard({ channel }: { channel: DistributionChannel }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">{channel.name}</h3>
        <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          {phaseLabels[channel.phase]}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{channel.description}</p>
      <p className="mt-3 rounded-lg bg-muted/70 p-3 text-xs leading-relaxed text-foreground">
        <strong>Próximo requisito:</strong> {channel.dependency}
      </p>
      {channel.documentationUrl && (
        <a
          href={channel.documentationUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-foreground underline underline-offset-4"
        >
          Documentação ou cadastro oficial
          <span aria-hidden="true" className="ml-1">↗</span>
        </a>
      )}
    </div>
  );
}

export default async function IntegracoesPage() {
  const user = await currentUser();
  if (user.role !== "ADMIN") redirect("/clientes");

  const apps = listDistributionChannels("mobile");
  const terminals = listDistributionChannels("smartpos");
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:space-y-7 sm:p-7">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">AquaFlow • Expansão</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Aplicativos e maquininhas</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Acompanhe a preparação dos canais de distribuição. Esta página é informativa:
          nenhuma maquininha está conectada, nenhum pagamento é ativado por esta tela e
          os dados dos lava-rápidos continuam separados.
        </p>
      </header>
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          [String(apps.length).padStart(2,"0"), "Plataformas mobile mapeadas"],
          [String(terminals.length).padStart(2,"0"), "Marcas de SmartPOS mapeadas"],
          ["00", "Canais publicados por esta integração"],
        ].map(([number, label]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-3xl font-black tabular-nums">{number}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>
      <section aria-labelledby="mobile-heading">
        <h2 id="mobile-heading" className="mb-3 text-lg font-bold">Celulares — Android e iPhone</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {apps.map((channel) => <ChannelCard key={channel.id} channel={channel} />)}
        </div>
      </section>
      <section aria-labelledby="smartpos-heading">
        <h2 id="smartpos-heading" className="mb-3 text-lg font-bold">Maquininhas inteligentes</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {terminals.map((channel) => <ChannelCard key={channel.id} channel={channel} />)}
        </div>
      </section>
      <aside className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-bold">Proteções obrigatórias</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Um aplicativo para todos os lava-rápidos, mas com sessão, permissões, licença e banco
          isolado por estabelecimento. Cada maquininha recebe na conta do próprio negócio.
          As integrações devem usar SDK homologado, autenticação, idempotência e conciliação;
          a cobrança fica bloqueada até esses requisitos serem validados.
        </p>
        <Link
          href="/configuracoes"
          className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold underline underline-offset-4"
        >
          Voltar às configurações
        </Link>
      </aside>
    </main>
  );
}
