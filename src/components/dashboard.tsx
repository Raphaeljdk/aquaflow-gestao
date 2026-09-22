"use client";
import Link from "next/link";
import { useState } from "react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Banknote,
  CarFront,
  Clock3,
  Receipt,
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Droplets,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { useActions } from "@/components/layout/app-shell";
import {
  PageTitle,
  PanelHeading,
  StatusBadge,
  Avatar,
  Empty,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { money, dayKey, dateLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
export function Dashboard() {
  const { data, user } = useStore(),
    actions = useActions(),
    [days, setDays] = useState("7"),
    [filter, setFilter] = useState("todos");
  if (!data) return null;
  const today = dayKey(new Date()),
    finished = data.comandas.filter(
      (o) =>
        o.finalizadoEm &&
        dayKey(o.finalizadoEm) === today &&
        ["FINALIZADO", "ENTREGUE"].includes(o.status),
    ),
    revenue = finished.reduce((n, o) => n + o.total, 0);
  const active = data.comandas.filter((o) =>
      ["AGUARDANDO", "EM_LAVAGEM", "FINALIZADO"].includes(o.status),
    ),
    waiting = active.filter((o) => o.status === "AGUARDANDO"),
    washing = active.filter((o) => o.status === "EM_LAVAGEM");
  const chart = Array.from({ length: Number(days) }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - Number(days) + 1 + i);
    const key = dayKey(d);
    return {
      day: dateLabel(d, Number(days) === 7 ? "EEE" : "dd"),
      value: data.comandas
        .filter(
          (o) =>
            o.finalizadoEm &&
            dayKey(o.finalizadoEm) === key &&
            ["FINALIZADO", "ENTREGUE"].includes(o.status),
        )
        .reduce((n, o) => n + o.total, 0),
    };
  });
  const chartTotal = chart.reduce((n, c) => n + c.value, 0);
  const previous = data.comandas
      .filter((o) => {
        if (!o.finalizadoEm) return false;
        const diff = Math.floor(
          (Date.now() - new Date(o.finalizadoEm).getTime()) / 86400000,
        );
        return diff >= Number(days) && diff < Number(days) * 2;
      })
      .reduce((n, o) => n + o.total, 0),
    growth = previous ? ((chartTotal - previous) / previous) * 100 : 0;
  const ranked = data.servicos
      .map((s) => ({
        ...s,
        count: data.comandas
          .filter(
            (o) =>
              o.finalizadoEm &&
              ["FINALIZADO", "ENTREGUE"].includes(o.status) &&
              new Date(o.finalizadoEm).getTime() >=
                Date.now() - Number(days) * 86400000,
          )
          .flatMap((o) => o.itens)
          .filter((i) => i.servicoId === s.id)
          .reduce((n, i) => n + i.quantidade, 0),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4),
    max = ranked[0]?.count || 1;
  const upcoming = data.agendamentos
    .filter((a) => a.status === "AGENDADO" && dayKey(a.dataHora) === today)
    .slice(0, 3);
  const metrics = [
    {
      label: "Faturamento do dia",
      value: money(revenue),
      icon: Banknote,
      description: "Pagamentos confirmados",
      color: "bg-sky-50 text-sky-600 dark:bg-sky-900/30",
    },
    {
      label: "Serviços realizados",
      value: String(finished.length).padStart(2, "0"),
      icon: CarFront,
      description: "Atendimentos finalizados hoje",
      color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30",
    },
    {
      label: "Veículos na fila",
      value: String(waiting.length + washing.length).padStart(2, "0"),
      icon: Clock3,
      description:
        waiting.length + " aguardando · " + washing.length + " em lavagem",
      color: "bg-amber-50 text-amber-600 dark:bg-amber-900/30",
    },
    {
      label: "Ticket médio",
      value: money(finished.length ? revenue / finished.length : 0),
      icon: Receipt,
      description: "Por atendimento concluído",
      color: "bg-violet-50 text-violet-600 dark:bg-violet-900/30",
    },
  ];
  const isWasher = user?.role === "LAVADOR";
  return (
    <>
      <PageTitle
        title="Visão geral"
        description="Seu lava rápido em movimento. Tudo sob controle."
        action={!isWasher ? actions.newOrder : undefined}
        actionLabel="Nova comanda"
      >
        <span className="hidden h-10 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm text-muted-foreground xl:inline-flex">
          <CalendarDays size={14} />
          {dateLabel(new Date(), "dd 'de' MMM, yyyy")}
        </span>
      </PageTitle>
      <div
        className={cn(
          "mb-6 grid gap-4 sm:grid-cols-2",
          !isWasher && "xl:grid-cols-4",
        )}
      >
        {metrics
          .filter((_, i) => !isWasher || i === 1 || i === 2)
          .map((m, i) => (
            <div
              key={m.label}
              className="panel group px-5 py-5 transition-shadow hover:shadow-md hover:shadow-slate-900/3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {m.label}
                </p>
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl",
                    m.color,
                  )}
                >
                  <m.icon size={18} />
                </div>
              </div>
              <p className="metric-number mt-3 text-[29px] font-semibold leading-tight">
                {m.value}
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                {i === 0 && (
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                )}
                {m.description}
              </p>
            </div>
          ))}
      </div>
      {!isWasher && (
        <div className="mb-6 grid gap-5 xl:grid-cols-[1.85fr_1fr]">
          <section className="panel min-w-0">
            <PanelHeading
              title="Faturamento"
              subtitle="Acompanhe o desempenho do seu negócio"
            >
              <Tabs value={days} onValueChange={setDays}>
                <TabsList className="h-8 rounded-lg bg-background p-1">
                  <TabsTrigger value="7" className="px-3 text-xs">
                    7 dias
                  </TabsTrigger>
                  <TabsTrigger value="30" className="px-3 text-xs">
                    30 dias
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </PanelHeading>
            <div className="flex flex-wrap items-baseline gap-3 px-6">
              <strong className="metric-number text-[28px] font-semibold">
                {money(chartTotal)}
              </strong>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  growth >= 0 ? "text-emerald-600" : "text-amber-600",
                )}
              >
                <TrendingUp size={12} />
                {growth >= 0 ? "+" : ""}
                {growth.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">
                vs. período anterior
              </span>
            </div>
            <div className="mt-5 h-[210px] w-full pr-5 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chart}
                  margin={{ top: 10, right: 8, left: -6, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="revenueFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#14afe0"
                        stopOpacity={0.18}
                      />
                      <stop
                        offset="95%"
                        stopColor="#14afe0"
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 5"
                    vertical={false}
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={12}
                    minTickGap={23}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(v)
                    }
                    tickMargin={10}
                    width={58}
                  />
                  <Tooltip
                    formatter={(v) => [money(Number(v)), "Faturamento"]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      fontSize: 12,
                      color: "var(--foreground)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#08a0d1"
                    strokeWidth={2.5}
                    fill="url(#revenueFill)"
                    activeDot={{ r: 5, strokeWidth: 3, stroke: "white" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="panel">
            <PanelHeading
              title="Serviços mais vendidos"
              subtitle={"Os favoritos nos últimos " + days + " dias"}
            >
              <div className="rounded-lg bg-accent p-2 text-primary">
                <SparklesIcon />
              </div>
            </PanelHeading>
            <div className="space-y-5 px-6 pb-5">
              {ranked.map((s, i) => (
                <div key={s.id}>
                  <div className="mb-2 flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground/70">
                      0{i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium">{s.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.count} serviços
                    </span>
                  </div>
                  <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: (s.count / max) * 100 + "%",
                        opacity: 1 - i * 0.18,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {["ADMIN", "GERENTE"].includes(user?.role ?? "") && (
              <Link
                href="/relatorios"
                className="flex items-center justify-center gap-2 border-t border-border py-3.5 text-sm font-medium text-primary hover:bg-accent"
              >
                Ver relatório completo
                <ArrowRight size={13} />
              </Link>
            )}
          </section>
        </div>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[1.85fr_1fr]">
        <section className="panel min-w-0 overflow-hidden">
          <PanelHeading
            title="Operação em tempo real"
            subtitle="Da chegada ao último detalhe."
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {active.length} veículos
            </span>
          </PanelHeading>
          <Tabs value={filter} onValueChange={setFilter} className="px-6">
            <TabsList className="h-auto gap-4 rounded-none border-b border-border bg-transparent p-0">
              <TabsTrigger
                value="todos"
                className="rounded-none border-0 border-b-2 border-transparent px-0 pb-3 text-sm shadow-none! data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
              >
                Todos
                <span className="ml-1 rounded bg-muted px-1.5 py-.5 text-xs">
                  {active.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="EM_LAVAGEM"
                className="rounded-none border-0 border-b-2 border-transparent px-0 pb-3 text-sm shadow-none! data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
              >
                Em lavagem
              </TabsTrigger>
              <TabsTrigger
                value="AGUARDANDO"
                className="rounded-none border-0 border-b-2 border-transparent px-0 pb-3 text-sm shadow-none! data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
              >
                Aguardando
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 pl-6 text-xs uppercase tracking-wider text-muted-foreground">
                  Veículo / Cliente
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Serviço
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Abrir</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active
                .filter((o) => filter === "todos" || o.status === filter)
                .slice(0, 5)
                .map((o) => {
                  const v = data.veiculos.find((v) => v.id === o.veiculoId),
                    c = data.clientes.find((c) => c.id === o.clienteId);
                  return (
                    <TableRow
                      key={o.id}
                      className="cursor-pointer hover:bg-accent/30"
                      onClick={() => actions.showOrder(o.id)}
                    >
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="hidden rounded-lg bg-muted p-2 text-muted-foreground 2xl:block">
                            <CarFront size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">
                              {v?.marca} {v?.modelo}
                              <span className="ml-2 hidden text-xs font-normal text-muted-foreground 2xl:inline">
                                {v?.placa}
                              </span>
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {c?.nome}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[125px] truncate text-sm">
                          {o.itens[0]?.nome}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {dateLabel(o.createdAt, "HH:mm")}
                          {o.itens.length > 1
                            ? " · +" + (o.itens.length - 1)
                            : ""}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={o.status} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={"Abrir comanda " + o.numero}
                          className="size-7"
                        >
                          <ChevronRight size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
          {active.length === 0 && (
            <Empty
              title="Fila livre"
              text="As novas comandas aparecerão aqui."
            />
          )}
          <Link
            href="/comandas"
            className="flex items-center justify-center gap-2 border-t border-border py-3.5 text-sm font-medium text-primary hover:bg-accent"
          >
            Ver todas as comandas
            <ArrowRight size={13} />
          </Link>
        </section>
        <div className="space-y-5">
          <section className="panel">
            <PanelHeading title="Próximos agendamentos">
              <Link
                href="/agendamentos"
                className="text-sm font-medium text-primary"
              >
                Ver agenda
              </Link>
            </PanelHeading>
            <div className="px-6 pb-2">
              {upcoming.length === 0 ? (
                <p className="py-7 text-sm text-muted-foreground">
                  Nenhum agendamento para hoje.
                </p>
              ) : (
                upcoming.map((a, i) => {
                  const c = data.clientes.find((c) => c.id === a.clienteId),
                    v = data.veiculos.find((v) => v.id === a.veiculoId);
                  return (
                    <Link
                      href="/agendamentos"
                      key={a.id}
                      className="flex items-center gap-3 border-b border-border py-4 first:pt-1 last:border-0"
                    >
                      <div className="rounded-lg bg-muted px-2.5 py-2.5 text-sm font-semibold">
                        {dateLabel(a.dataHora, "HH:mm")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{c?.nome}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {v?.modelo} ·{" "}
                          {
                            data.servicos.find((s) => s.id === a.servicoIds[0])
                              ?.nome
                          }
                        </p>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-muted-foreground"
                      />
                    </Link>
                  );
                })
              )}
            </div>
          </section>
          <div className="rounded-xl border border-cyan-100 bg-[#eaf8fd] p-5 dark:border-cyan-900 dark:bg-cyan-950/30">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-white/80 p-2 text-primary dark:bg-cyan-900/40">
                <Droplets size={18} />
              </div>
              <h3 className="text-sm font-semibold">Sua equipe em ação</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {
                data.funcionarios.filter(
                  (f) => f.ativo && f.cargo === "LAVADOR",
                ).length
              }{" "}
              lavadores ativos para cuidar de cada detalhe.
            </p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex -space-x-2">
                {data.funcionarios
                  .filter((f) => f.ativo && f.cargo === "LAVADOR")
                  .slice(0, 4)
                  .map((f, i) => (
                    <div
                      key={f.id}
                      className="rounded-full border-2 border-[#eaf8fd] dark:border-cyan-950"
                    >
                      <Avatar name={f.nome} index={i} />
                    </div>
                  ))}
              </div>
              {["ADMIN", "GERENTE"].includes(user?.role ?? "") && (
                <Link
                  href="/funcionarios"
                  className="flex items-center gap-1 text-sm font-medium text-primary"
                >
                  Ver equipe
                  <ArrowUpRight size={14} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
function SparklesIcon() {
  return <TrendingUp size={16} />;
}
