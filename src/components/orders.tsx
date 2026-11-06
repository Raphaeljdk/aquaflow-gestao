"use client";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  List,
  Clock,
  CarFront,
  CheckCircle2,
  MoreHorizontal,
  PackageCheck,
  SquareCheckBig,
} from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { useActions } from "./layout/app-shell";
import {
  PageTitle,
  SearchInput,
  Choice,
  StatusBadge,
  Empty,
  Avatar,
} from "./common";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { statusLabels, type Status } from "@/types";
import { duracaoAtendimento, previsaoServicos } from "@/lib/order-timing";
import { OrderProductivity } from "@/components/order-productivity";
import { canManage } from "@/lib/permissions";
import { money, dateLabel } from "@/lib/format";
import { apareceNaFilaOperacional, estadosFilaOperacional } from "@/lib/order-visibility";
export function Orders() {
  const { data, user, mutate, busy } = useStore(),
    a = useActions(),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("ATIVAS"),
    [view, setView] = useState("table"),
    [page, setPage] = useState(0),
    [now, setNow] = useState(0),
    [selectionMode, setSelectionMode] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [delivering, setDelivering] = useState(false);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  async function deliverSelected() {
    if (!data || busy || delivering) return;
    const eligible = data.comandas.filter((o) => selected.includes(o.id) && o.status === "FINALIZADO");
    if (!eligible.length) return;
    if (!window.confirm("Confirmar a entrega de " + eligible.length + " veículo(s)? As comandas sairão do painel, mas continuarão no histórico e financeiro.")) return;
    setDelivering(true);
    try {
      const remaining: string[] = [];
      for (const order of eligible) {
        const saved = await mutate({
          entity: "comandas", method: "PATCH", id: order.id,
          data: { status: "ENTREGUE" },
        });
        if (!saved) remaining.push(order.id);
      }
      setSelected(remaining);
      if (!remaining.length) setSelectionMode(false);
    } finally {
      setDelivering(false);
    }
  }
  if (!data) return null;
  const filtered = data.comandas
    .filter((o) => {
      const c = data.clientes.find((c) => c.id === o.clienteId),
        v = data.veiculos.find((v) => v.id === o.veiculoId),
        q = search.toLowerCase();
      return (
        (status === "TODAS" || (status === "ATIVAS" && apareceNaFilaOperacional(o.status)) ||
          o.status === status) &&
        (!q ||
          [c?.nome, v?.placa, v?.modelo, String(o.numero)].some((x) =>
            x?.toLowerCase().includes(q),
          ))
      );
    })
    .sort((a, b) => b.numero - a.numero);
  const ready = filtered.filter((o) => o.status === "FINALIZADO");
  const eligibleSelected = selected.filter((id) => ready.some((o) => o.id === id));
  const toggleSelected = (id: string) => setSelected((prev) =>
    prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
  );
  return (
    <>
      <PageTitle
        title="Comandas"
        description="Acompanhe apenas os atendimentos em andamento. Finalizadas saem automaticamente da fila e continuam no histórico."
        action={a.newOrder}
        actionLabel="Nova comanda"
      />
      {user && canManage(user.role) && <OrderProductivity data={data} now={now} />}
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap justify-between gap-3 border-b border-border p-5">
          <div className="flex flex-1 flex-wrap gap-3">
            <div className="min-w-[220px] flex-1 sm:max-w-sm">
              <SearchInput
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(0);
                }}
                placeholder="Buscar por placa, cliente ou comanda"
              />
            </div>
            <div className="w-48">
              <Choice
                value={status}
                onChange={(v) => {
                  setStatus(v);
                  setPage(0);
                }}
                options={[
                  { value: "ATIVAS", label: "Em atendimento" },
                  { value: "TODAS", label: "Todas as comandas" },
                  ...Object.entries(statusLabels).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
            </div>
          </div>
          <Tabs value={view} onValueChange={setView}>
            <TabsList>
              <TabsTrigger value="table" aria-label="Visualização em tabela">
                <List size={17} />
              </TabsTrigger>
              <TabsTrigger value="board" aria-label="Visualização em quadro">
                <LayoutGrid size={17} />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Finalizou a lavagem? A comanda sai automaticamente desta fila. Consulte em Todas as comandas ou no filtro Pronto para retirada.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {status === "ATIVAS" && (
              <Button type="button" variant="outline" size="sm"
                onClick={() => { setStatus("FINALIZADO"); setView("table"); setPage(0); setSelectionMode(false); setSelected([]); }}>
                Ver finalizadas
              </Button>
            )}
            {selectionMode && (
              <>
                <Button variant="outline" size="sm" disabled={!ready.length || delivering}
                  onClick={() => setSelected(ready.map((o) => o.id))}>
                  Selecionar prontos ({ready.length})
                </Button>
                <Button variant="outline" size="sm" disabled={!selected.length || delivering}
                  onClick={() => setSelected([])}>Limpar seleção</Button>
                <Button size="sm" disabled={!eligibleSelected.length || busy || delivering}
                  onClick={() => void deliverSelected()}>
                  <PackageCheck size={15} /> Confirmar entrega ({eligibleSelected.length})
                </Button>
              </>
            )}
            {(selectionMode || ready.length > 0) && (
              <Button variant="outline" size="sm" disabled={delivering}
                onClick={() => { setSelectionMode((value) => !value); setSelected([]); }}>
                <SquareCheckBig size={15} /> {selectionMode ? "Cancelar seleção" : "Selecionar comandas"}
              </Button>
            )}
          </div>
        </div>
        {view === "table" ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {selectionMode && <TableHead className="w-10">Selecionar</TableHead>}
                  <TableHead className="pl-5">Comanda</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(page * 12, page * 12 + 12).map((o) => {
                  const c = data.clientes.find((c) => c.id === o.clienteId),
                    v = data.veiculos.find((v) => v.id === o.veiculoId),
                    f = data.funcionarios.find((f) => f.id === o.funcionarioId);
                  return (
                    <TableRow key={o.id}>
                      {selectionMode && <TableCell>
                        <input type="checkbox" aria-label={"Selecionar comanda " + o.numero}
                          checked={selected.includes(o.id)}
                          disabled={o.status !== "FINALIZADO" || delivering}
                          onChange={() => toggleSelected(o.id)}
                          className="h-4 w-4 accent-primary" />
                      </TableCell>}
                      <TableCell className="pl-5">
                        <p className="font-semibold">#{o.numero}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {dateLabel(o.createdAt)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="mb-1.5 text-sm">
                          {v?.marca} {v?.modelo}
                        </p>
                        <span className="plate">{v?.placa}</span>
                      </TableCell>
                      <TableCell className="text-sm">{c?.nome}</TableCell>
                      <TableCell>
                        <StatusBadge status={o.status} />
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                          <Clock size={12} aria-hidden="true" />
                          {duracaoAtendimento(o, now).texto}
                          {previsaoServicos(o, data.servicos) > 0 && (
                            <span className={duracaoAtendimento(o, now).segundos >
                              previsaoServicos(o, data.servicos) * 60 && !["FINALIZADO", "ENTREGUE", "CANCELADO"].includes(o.status)
                              ? "text-amber-600 dark:text-amber-400" : ""}>
                              / {previsaoServicos(o, data.servicos)} min previstos
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {f?.nome ?? "Não atribuído"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {money(o.total)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => a.showOrder(o.id)}
                        >
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {!filtered.length && <Empty />}
            <div className="flex items-center justify-between border-t border-border p-4 text-xs text-muted-foreground">
              <span>{filtered.length} comandas</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span>
                  {page + 1} / {Math.max(1, Math.ceil(filtered.length / 12))}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(page + 1) * 12 >= filtered.length}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="grid gap-4 bg-background p-5 lg:grid-cols-2">
            {(status === "ATIVAS" ? estadosFilaOperacional :
              status === "TODAS" ? (Object.keys(statusLabels) as Status[]) :
              [status as Status]).map(
              (s) => (
                <div key={s} className="min-w-0">
                  <div className="mb-4 flex items-center justify-between">
                    <StatusBadge status={s} />
                    <span className="text-xs text-muted-foreground">
                      {filtered.filter((o) => o.status === s).length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {filtered
                      .filter((o) => o.status === s)
                      .map((o) => {
                        const v = data.veiculos.find(
                            (v) => v.id === o.veiculoId,
                          ),
                          c = data.clientes.find((c) => c.id === o.clienteId);
                        return (
                          <button
                            key={o.id}
                            onClick={() => selectionMode && o.status === "FINALIZADO"
                              ? toggleSelected(o.id)
                              : !selectionMode ? a.showOrder(o.id) : undefined}
                            disabled={selectionMode && o.status !== "FINALIZADO"}
                            aria-pressed={selectionMode && o.status === "FINALIZADO" ? selected.includes(o.id) : undefined}
                            className={"panel block w-full p-4 text-left hover:border-primary/50 hover:shadow-md " +
                              (selectionMode && selected.includes(o.id) ? "ring-2 ring-primary " : "") +
                              (selectionMode && o.status !== "FINALIZADO" ? "opacity-60" : "")}
                          >
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">
                                {selectionMode && o.status === "FINALIZADO" ? (selected.includes(o.id) ? "☑ " : "☐ ") : ""}#{o.numero}
                              </span>
                              <span className="plate">{v?.placa}</span>
                            </div>
                            <p className="mt-4 font-semibold">
                              {v?.marca} {v?.modelo}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {c?.nome}
                            </p>
                            <p className="my-4 text-sm">
                              {o.itens.map((i) => i.nome).join(" + ")}
                            </p>
                            <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                              <Clock size={13} aria-hidden="true" />
                              <span>{duracaoAtendimento(o, now).texto}</span>
                              {previsaoServicos(o, data.servicos) > 0 && (
                                <span className={duracaoAtendimento(o, now).segundos >
                                  previsaoServicos(o, data.servicos) * 60 && s !== "FINALIZADO"
                                  ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>
                                  / {previsaoServicos(o, data.servicos)} min previstos
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between border-t border-border pt-3">
                              <span className="text-xs text-muted-foreground">
                                {dateLabel(o.createdAt, "HH:mm")}
                              </span>
                              <strong className="text-sm">
                                {money(o.total)}
                              </strong>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </>
  );
}
