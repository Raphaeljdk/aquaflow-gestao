"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, CalendarDays, CarFront, CheckCircle2, Clock3, Loader2, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
type Parceiro = { id: string; nome: string; cidade: string };
type FetchStatus = "loading" | "ready" | "empty" | "error";

export default function PublicBookingPage() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [parceiroId, setParceiroId] = useState("");
  const [nome, setNome] = useState("");
  const [veiculo, setVeiculo] = useState("");
  const [servico, setServico] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const hoje = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const byType = (type: string) => hoje.find((part) => part.type === type)?.value ?? "";
  const minDate = byType("year") + "-" + byType("month") + "-" + byType("day");
  const parceiro = parceiros.find((p) => p.id === parceiroId);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/parceiros", { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Parceiros temporariamente indisponíveis.");
        return res.json() as Promise<{ parceiros: Parceiro[] }>;
      })
      .then((body) => {
        setParceiros(body.parceiros);
        setStatus(body.parceiros.length ? "ready" : "empty");
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, []);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || !parceiro) return;
    setSending(true); setError("");
    try {
      const res = await fetch("/api/public/parceiros/agendar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parceiroId, nome, veiculo, servico, data, horario, observacoes }),
      });
      const body = await res.json() as { url?: string; error?: string };
      if (!res.ok || !body.url) throw new Error(body.error || "Não foi possível abrir o WhatsApp.");
      // Navegação direta após a resposta da API: evita bloqueio de pop-up em celulares.
      window.location.assign(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao abrir o WhatsApp. Tente novamente.");
    } finally { setSending(false); }
  }

  const field = "h-12 w-full min-w-0 rounded-xl border border-input bg-background px-4 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-10">
        <header className="flex items-center justify-between gap-3">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Voltar ao sistema
          </Link>
          <span className="rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground">Rede de parceiros</span>
        </header>
        <div className="grid flex-1 items-start gap-10 py-10 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:gap-16 lg:py-16">
          <section className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-2 text-xs font-semibold uppercase tracking-wider">
              <MessageCircle size={16} className="text-primary" /> Agende com um parceiro
            </span>
            <h1 className="max-w-lg text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              Escolha seu lava-rápido e solicite um horário.
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              Encontre um estabelecimento parceiro, escolha o serviço e envie sua preferência diretamente para o WhatsApp da equipe.
            </p>
            <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
              <span className="flex items-center gap-3"><Building2 size={18} className="text-primary" /> Escolha um parceiro</span>
              <span className="flex items-center gap-3"><CarFront size={18} className="text-primary" /> Informe o veículo</span>
              <span className="flex items-center gap-3"><CalendarDays size={18} className="text-primary" /> Sugira o horário</span>
              <span className="flex items-center gap-3"><CheckCircle2 size={18} className="text-primary" /> Aguarde a confirmação</span>
            </div>
            <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <ShieldCheck size={17} className="mt-0.5 shrink-0" />
              O pedido não reserva automaticamente um horário. Os dados digitados são usados para abrir a mensagem no WhatsApp escolhido; não são salvos como agendamento aqui.
            </p>
          </section>
          <section className="min-w-0 rounded-3xl border border-border bg-card p-4 shadow-xl shadow-black/5 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Clock3 size={23} /></span>
              <div>
                <h2 className="text-xl font-bold">Solicitar um horário</h2>
                <p className="text-sm text-muted-foreground">Com um lava-rápido da rede</p>
              </div>
            </div>
            {status === "loading" && (
              <p role="status" className="flex items-center gap-2 rounded-xl bg-muted p-4 text-sm"><Loader2 size={17} className="animate-spin" /> Consultando parceiros disponíveis...</p>
            )}
            {status === "error" && (
              <div role="alert" className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
                <p>Não foi possível consultar os parceiros. Atualize a página e tente novamente.</p>
                <button type="button" onClick={() => window.location.reload()} className="font-semibold underline underline-offset-4">Tentar novamente</button>
              </div>
            )}
            {status === "empty" && (
              <div role="status" className="rounded-2xl border border-border bg-muted/40 p-5">
                <Building2 size={24} className="mb-3 text-primary" />
                <h3 className="font-bold">Nenhum parceiro disponível no momento</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  A rede ainda não possui lava-rápidos com agendamento público ativado. Volte quando houver estabelecimentos habilitados.
                </p>
              </div>
            )}
            {status === "ready" && (
              <form onSubmit={(event) => void enviar(event)} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="booking-parceiro" className="text-sm font-semibold">Lava-rápido parceiro <span className="text-primary">*</span></label>
                  <select id="booking-parceiro" required value={parceiroId} onChange={(event) => setParceiroId(event.target.value)}
                    className={field}>
                    <option value="">Selecione onde deseja agendar</option>
                    {parceiros.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.cidade ? " · " + p.cidade : ""}</option>)}
                  </select>
                  {parceiro && <p className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs">
                    <MapPin size={15} className="shrink-0 text-primary" />
                    Seu pedido será enviado ao WhatsApp de <strong>{parceiro.nome}</strong>.
                  </p>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="booking-nome" className="text-sm font-semibold">Seu nome</label>
                  <input id="booking-nome" required minLength={2} maxLength={100} value={nome} onChange={(event) => setNome(event.target.value)}
                    placeholder="Como podemos chamar você?" className={field} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="booking-veiculo" className="text-sm font-semibold">Veículo</label>
                  <input id="booking-veiculo" required minLength={2} maxLength={100} value={veiculo} onChange={(event) => setVeiculo(event.target.value)}
                    placeholder="Ex.: Onix preto" className={field} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="booking-servico" className="text-sm font-semibold">Serviço desejado</label>
                  <input id="booking-servico" required minLength={2} maxLength={100} value={servico} onChange={(event) => setServico(event.target.value)}
                    placeholder="Ex.: lavagem completa ou consultar serviços" className={field} />
                  <p className="text-xs text-muted-foreground">Serviços e valores dependem do lava-rápido selecionado.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="booking-data" className="text-sm font-semibold">Data desejada</label>
                    <input id="booking-data" required type="date" min={minDate} value={data} onChange={(event) => setData(event.target.value)}
                      className={field} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="booking-horario" className="text-sm font-semibold">Horário preferido</label>
                    <input id="booking-horario" required type="time" value={horario} onChange={(event) => setHorario(event.target.value)}
                      className={field} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="booking-observacoes" className="text-sm font-semibold">Observações (opcional)</label>
                  <textarea id="booking-observacoes" rows={3} maxLength={400} value={observacoes} onChange={(event) => setObservacoes(event.target.value)}
                    placeholder="Algo que a equipe deva saber?" className="w-full resize-y rounded-xl border border-input bg-background p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
                <button type="submit" disabled={sending || !parceiro}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">
                  {sending ? <Loader2 size={17} className="animate-spin" /> : <MessageCircle size={18} />}
                  {sending ? "Preparando mensagem..." : "Continuar no WhatsApp"} <ArrowRight size={17} />
                </button>
                <p className="text-center text-xs leading-5 text-muted-foreground">
                  A mensagem será aberta no WhatsApp do parceiro. O agendamento depende da confirmação da equipe.
                </p>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
