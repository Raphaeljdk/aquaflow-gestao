"use client";
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, startOfWeek } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CarFront,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { PageTitle, Picker, Choice, Empty } from "./common";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "./ui/alert-dialog";
import { Textarea } from "./ui/textarea";
import { agendamentoSchema } from "@/lib/validations";
import { dayKey, fromLocal, dateLabel, money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useActions } from "./layout/app-shell";
import { ErrorText } from "./forms/order-form";
export function Appointments() {
  const { data, mutate, busy } = useStore(),
    actions = useActions(),
    [date, setDate] = useState(dayKey(new Date())),
    [open, setOpen] = useState(false),
    [preset, setPreset] = useState(""),
    [cancel, setCancel] = useState<string | null>(null);
  if (!data) return null;
  const anchor = new Date(date + "T12:00:00"),
    week = startOfWeek(anchor, { weekStartsOn: 1 }),
    today = dayKey(new Date()),
    appointments = data.agendamentos
      .filter((a) => dayKey(a.dataHora) === date)
      .sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  const shift = (days: number) => setDate(dayKey(addDays(anchor, days)));
  const min = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const slots = Array.from(
    {
      length: Math.max(
        0,
        Math.floor(
          (min(data.configuracao.fechamento) -
            min(data.configuracao.abertura)) /
            data.configuracao.intervaloMin,
        ),
      ),
    },
    (_, i) => {
      const n =
        min(data.configuracao.abertura) + i * data.configuracao.intervaloMin;
      return (
        String(Math.floor(n / 60)).padStart(2, "0") +
        ":" +
        String(n % 60).padStart(2, "0")
      );
    },
  );
  const isOpen = data.configuracao.diasSemana.includes(anchor.getDay());
  return (
    <>
      <PageTitle
        title="Agendamentos"
        description="Reserve um horário e prepare o próximo atendimento."
        action={() => {
          setPreset("");
          setOpen(true);
        }}
        actionLabel="Novo agendamento"
      />
      <div className="panel mb-5 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarDays size={19} className="text-primary" />
            <h2 className="font-semibold capitalize">
              {dateLabel(anchor, "MMMM yyyy")}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setDate(today)}>
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Semana anterior"
              onClick={() => shift(-7)}
            >
              <ChevronLeft size={17} />
            </Button>
            <Input
              aria-label="Data da agenda"
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="w-39"
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Próxima semana"
              onClick={() => shift(7)}
            >
              <ChevronRight size={17} />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 md:gap-3">
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(week, i),
              key = dayKey(d),
              count = data.agendamentos.filter(
                (a) => dayKey(a.dataHora) === key && a.status === "AGENDADO",
              ).length;
            return (
              <button
                key={key}
                onClick={() => setDate(key)}
                className={cn(
                  "rounded-xl border px-1 py-3 text-center transition",
                  key === date
                    ? "border-primary bg-primary text-white"
                    : "border-border hover:bg-accent",
                )}
              >
                <span
                  className={cn(
                    "text-xs uppercase md:text-xs",
                    key === date ? "text-white/80" : "text-muted-foreground",
                  )}
                >
                  {dateLabel(d, "EEE")}
                </span>
                <strong className="mt-2 block text-xl font-semibold">
                  {dateLabel(d, "dd")}
                </strong>
                <span
                  className={cn(
                    "mx-auto mt-2 block size-1 rounded-full",
                    count
                      ? key === date
                        ? "bg-white"
                        : "bg-primary"
                      : "bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[1.35fr_1fr]">
        <section className="panel p-5">
          <h2 className="mb-1 font-semibold">Horários disponíveis</h2>
          <p className="mb-5 text-xs text-muted-foreground">
            {dateLabel(anchor, "EEEE, dd 'de' MMMM")} · Reserva de um veículo
            por vez
          </p>
          {!isOpen ? (
            <Empty
              title="Empresa fechada"
              text="Escolha um dia de funcionamento para agendar."
            />
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {slots.map((time) => {
                const instant = new Date(fromLocal(date + "T" + time)),
                  occupied = appointments.some(
                    (a) =>
                      a.status === "AGENDADO" &&
                      instant >= new Date(a.dataHora) &&
                      instant < new Date(a.fim),
                  ),
                  past = instant <= new Date();
                return (
                  <button
                    disabled={occupied || past}
                    key={time}
                    onClick={() => {
                      setPreset(time);
                      setOpen(true);
                    }}
                    className={cn(
                      "rounded-xl border p-3 text-center disabled:cursor-not-allowed",
                      occupied
                        ? "border-primary/20 bg-accent text-primary"
                        : past
                          ? "border-border bg-muted text-muted-foreground/50"
                          : "border-border hover:border-primary hover:bg-accent",
                    )}
                  >
                    <span className="block text-sm font-semibold">{time}</span>
                    <span className="mt-1 block text-xs">
                      {occupied
                        ? "Reservado"
                        : past
                          ? "Encerrado"
                          : "Disponível"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="mt-5 text-xs text-muted-foreground">
            A disponibilidade final considera a duração de todos os serviços
            escolhidos.
          </p>
        </section>
        <section className="panel p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">Agenda do dia</h2>
            <span className="rounded-md bg-muted px-2 py-1 text-xs">
              {appointments.length}
            </span>
          </div>
          {!appointments.length ? (
            <Empty
              title="Sua agenda está livre"
              text="Selecione um horário ao lado para começar."
            />
          ) : (
            <div className="space-y-4">
              {appointments.map((a) => {
                const c = data.clientes.find((c) => c.id === a.clienteId),
                  v = data.veiculos.find((v) => v.id === a.veiculoId);
                return (
                  <div
                    className={
                      "rounded-xl border border-border p-4 " +
                      (a.status === "CANCELADO" ? "opacity-50" : "")
                    }
                    key={a.id}
                  >
                    <div className="flex items-start justify-between">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                        <Clock3 size={15} />
                        {dateLabel(a.dataHora, "HH:mm")} –{" "}
                        {dateLabel(a.fim, "HH:mm")}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {a.status === "AGENDADO"
                          ? "Confirmado"
                          : a.status === "CONVERTIDO"
                            ? "Comanda aberta"
                            : "Cancelado"}
                      </span>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold">{c?.nome}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {v?.marca} {v?.modelo} · {v?.placa}
                    </p>
                    <p className="mt-3 text-xs">
                      {a.servicoIds
                        .map(
                          (id) => data.servicos.find((s) => s.id === id)?.nome,
                        )
                        .join(" + ")}
                    </p>
                    {a.observacoes && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {a.observacoes}
                      </p>
                    )}
                    {a.status === "AGENDADO" && (
                      <div className="mt-4 flex gap-2 border-t border-border pt-3">
                        <Button
                          size="sm"
                          className="flex-1 text-xs"
                          disabled={busy || date !== today}
                          onClick={() =>
                            void mutate({
                              entity: "agendamentos",
                              method: "PATCH",
                              id: a.id,
                              data: { action: "convert" },
                            })
                          }
                        >
                          Abrir comanda
                          <ArrowRight size={13} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-destructive"
                          onClick={() => setCancel(a.id)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}
                    {a.status === "CONVERTIDO" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3 px-0 text-primary"
                        onClick={() =>
                          a.comandaId && actions.showOrder(a.comandaId)
                        }
                      >
                        Ver comanda
                        <ArrowRight size={13} />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      {open && (
        <AppointmentForm
          date={date}
          preset={preset}
          onClose={() => setOpen(false)}
        />
      )}
      <AlertDialog open={!!cancel} onOpenChange={(v) => !v && setCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O horário será liberado para outra reserva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={async (e) => {
                e.preventDefault();
                if (
                  cancel &&
                  (await mutate({
                    entity: "agendamentos",
                    method: "PATCH",
                    id: cancel,
                    data: { status: "CANCELADO" },
                  }))
                )
                  setCancel(null);
              }}
            >
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
function AppointmentForm({
  date,
  preset,
  onClose,
}: {
  date: string;
  preset: string;
  onClose: () => void;
}) {
  const { data, mutate, busy } = useStore(),
    [day, setDay] = useState(date),
    [time, setTime] = useState(preset);
  const f = useForm<{
    clienteId: string;
    veiculoId: string;
    dataHora: string;
    servicoIds: string[];
    observacoes: string;
  }>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: {
      clienteId: "",
      veiculoId: "",
      dataHora: preset ? fromLocal(date + "T" + preset) : "",
      servicoIds: [],
      observacoes: "",
    },
  });
  const values = f.watch();
  useEffect(() => {
    if (day && time) f.setValue("dataHora", fromLocal(day + "T" + time));
  }, [day, time, f]);
  if (!data) return null;
  const minutes = values.servicoIds.reduce(
    (sum, id) =>
      sum + (data.servicos.find((s) => s.id === id)?.duracaoMin ?? 0),
    0,
  );
  const min = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3)),
    open = min(data.configuracao.abertura),
    close = min(data.configuracao.fechamento);
  const available = Array.from(
    { length: Math.ceil((close - open) / data.configuracao.intervaloMin) },
    (_, i) => open + i * data.configuracao.intervaloMin,
  )
    .filter((n) => n + Math.max(15, minutes) <= close)
    .map(
      (n) =>
        String(Math.floor(n / 60)).padStart(2, "0") +
        ":" +
        String(n % 60).padStart(2, "0"),
    )
    .filter((t) => {
      const start = new Date(fromLocal(day + "T" + t)),
        end = new Date(start.getTime() + Math.max(15, minutes) * 60000);
      return (
        start > new Date() &&
        data.configuracao.diasSemana.includes(
          new Date(day + "T12:00:00").getDay(),
        ) &&
        !data.agendamentos.some(
          (a) =>
            a.status === "AGENDADO" &&
            start < new Date(a.fim) &&
            end > new Date(a.dataHora),
        )
      );
    });
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
          <DialogDescription>
            O horário é reservado pela duração total dos serviços.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={f.handleSubmit(async (v) => {
            if (
              await mutate({ entity: "agendamentos", method: "POST", data: v })
            )
              onClose();
          })}
        >
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Controller
              name="clienteId"
              control={f.control}
              render={({ field }) => (
                <Picker
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v);
                    f.setValue("veiculoId", "");
                  }}
                  options={data.clientes.map((c) => ({
                    value: c.id,
                    label: c.nome,
                  }))}
                  placeholder="Buscar cliente"
                />
              )}
            />
            <ErrorText message={f.formState.errors.clienteId?.message} />
          </div>
          <div className="space-y-2">
            <Label>Veículo</Label>
            <Controller
              name="veiculoId"
              control={f.control}
              render={({ field }) => (
                <Choice
                  value={field.value}
                  onChange={field.onChange}
                  options={data.veiculos
                    .filter((v) => v.clienteId === values.clienteId)
                    .map((v) => ({
                      value: v.id,
                      label: v.placa + " · " + v.modelo,
                    }))}
                  placeholder="Selecione o veículo"
                />
              )}
            />
            <ErrorText message={f.formState.errors.veiculoId?.message} />
          </div>
          <div className="space-y-2">
            <Label>Serviços</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.servicos
                .filter((s) => s.ativo)
                .map((s) => (
                  <label
                    className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs"
                    key={s.id}
                  >
                    <Checkbox
                      checked={values.servicoIds.includes(s.id)}
                      onCheckedChange={(v) =>
                        f.setValue(
                          "servicoIds",
                          v
                            ? [...values.servicoIds, s.id]
                            : values.servicoIds.filter((id) => id !== s.id),
                        )
                      }
                    />
                    {s.nome}
                    <span className="ml-auto text-muted-foreground">
                      {s.duracaoMin}m
                    </span>
                  </label>
                ))}
            </div>
            <ErrorText message={f.formState.errors.servicoIds?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="booking-day">Data</Label>
              <Input
                id="booking-day"
                type="date"
                min={dayKey(new Date())}
                value={day}
                onChange={(e) => {
                  if (e.target.value) {
                    setDay(e.target.value);
                    setTime("");
                    f.setValue("dataHora", "");
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Choice
                value={time}
                onChange={setTime}
                options={available.map((value) => ({ value, label: value }))}
                placeholder={available.length ? "Selecione" : "Sem horários"}
              />
              <ErrorText message={f.formState.errors.dataHora?.message} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {minutes} minutos estimados ·{" "}
            {money(
              values.servicoIds.reduce(
                (n, id) =>
                  n + (data.servicos.find((s) => s.id === id)?.preco ?? 0),
                0,
              ),
            )}
          </p>
          <div className="space-y-2">
            <Label htmlFor="booking-notes">Observações</Label>
            <Textarea id="booking-notes" {...f.register("observacoes")} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy || !available.includes(time)}>
              {busy && <Loader2 className="animate-spin" size={15} />}Confirmar
              agendamento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
