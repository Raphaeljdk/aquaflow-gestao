"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, CarFront, CheckCircle2, Clock3, MessageCircle, ShieldCheck } from "lucide-react";
import { whatsappLink } from "@/lib/whatsapp";

type PublicContact = { empresa: string; whatsapp: string | null; disponivel: boolean };
type ContactStatus = "loading" | "ready" | "unavailable";

export default function PublicBookingPage() {
  const [contact, setContact] = useState<PublicContact | null>(null);
  const [status, setStatus] = useState<ContactStatus>("loading");
  const [name, setName] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [service, setService] = useState("Lavagem completa");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/contato", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Contato indisponível");
        return response.json() as Promise<PublicContact>;
      })
      .then((data) => {
        setContact(data);
        setStatus(data.disponivel ? "ready" : "unavailable");
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setStatus("unavailable");
      });
    return () => controller.abort();
  }, []);

  function sendWhatsApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = [
      "Olá! Gostaria de solicitar um agendamento de lavagem.",
      "",
      "Nome: " + name.trim(),
      "Veículo: " + vehicle.trim(),
      "Serviço: " + service,
      "Data desejada: " + date.split("-").reverse().join("/"),
      "Horário desejado: " + time,
      notes.trim() ? "Observações: " + notes.trim() : "",
      "",
      "Pode me confirmar a disponibilidade, por favor?",
    ].filter(Boolean).join("\n");
    const url = whatsappLink(contact?.whatsapp, message);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/login" className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground">
            <ArrowLeft size={16} />
            <span>Voltar ao sistema</span>
          </Link>
          <span className="rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
            Atendimento por WhatsApp
          </span>
        </header>

        <div className="grid flex-1 items-center gap-8 py-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-16 lg:py-20">
          <section className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">
              <MessageCircle size={15} /> Agende sua lavagem
            </div>
            <h1 className="max-w-lg text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Seu carro merece um cuidado especial.
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
              Envie seu pedido diretamente para {contact?.empresa ?? "o lava-rápido"}.
              A equipe responderá pelo WhatsApp para confirmar o horário.
            </p>
            <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
              <span className="flex items-center gap-3"><CarFront size={19} className="shrink-0 text-primary" /> Informe seu veículo</span>
              <span className="flex items-center gap-3"><CalendarDays size={19} className="shrink-0 text-primary" /> Escolha sua preferência</span>
              <span className="flex items-center gap-3"><MessageCircle size={19} className="shrink-0 text-primary" /> Envie pelo WhatsApp</span>
              <span className="flex items-center gap-3"><CheckCircle2 size={19} className="shrink-0 text-primary" /> Aguarde a confirmação</span>
            </div>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck size={15} className="mt-0.5 shrink-0" />
              Esta página não grava seus dados no sistema: as informações serão enviadas por você ao WhatsApp do estabelecimento.
            </p>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-xl shadow-black/5 sm:p-8">
            <div className="mb-7 flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Clock3 size={23} /></span>
              <div>
                <h2 className="text-xl font-bold">Solicitar um horário</h2>
                <p className="text-sm text-muted-foreground">Preencha em menos de um minuto</p>
              </div>
            </div>

            {status === "unavailable" && (
              <div role="status" className="mb-6 rounded-xl border border-border bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
                O WhatsApp de agendamento ainda não foi configurado por este estabelecimento. Entre em contato diretamente com a equipe.
              </div>
            )}
            <form onSubmit={sendWhatsApp} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="booking-name" className="text-sm font-semibold">Seu nome</label>
                <input id="booking-name" required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Como podemos chamar você?" className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="space-y-2">
                <label htmlFor="booking-vehicle" className="text-sm font-semibold">Veículo</label>
                <input id="booking-vehicle" required minLength={2} maxLength={100} value={vehicle} onChange={(e) => setVehicle(e.target.value)}
                  placeholder="Ex.: Onix preto" className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="space-y-2">
                <label htmlFor="booking-service" className="text-sm font-semibold">Serviço desejado</label>
                <select id="booking-service" value={service} onChange={(e) => setService(e.target.value)}
                  className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option>Lavagem completa</option>
                  <option>Lavagem simples</option>
                  <option>Lavagem detalhada</option>
                  <option>Outro serviço (consultar)</option>
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="booking-date" className="text-sm font-semibold">Data desejada</label>
                  <input id="booking-date" required type="date" min={new Date().toLocaleDateString("en-CA")} value={date} onChange={(e) => setDate(e.target.value)}
                    className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="booking-time" className="text-sm font-semibold">Horário preferido</label>
                  <input id="booking-time" required type="time" value={time} onChange={(e) => setTime(e.target.value)}
                    className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="booking-notes" className="text-sm font-semibold">Observações (opcional)</label>
                <textarea id="booking-notes" maxLength={400} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Mais algum detalhe?" className="w-full resize-y rounded-xl border border-input bg-background p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <button type="submit" disabled={status !== "ready"}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">
                <MessageCircle size={18} /> {status === "loading" ? "Verificando WhatsApp..." : "Enviar pedido pelo WhatsApp"} <ArrowRight size={17} />
              </button>
              <p className="text-center text-xs leading-5 text-muted-foreground">
                O envio é uma solicitação. O horário só estará reservado após a confirmação do lava-rápido.
              </p>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
