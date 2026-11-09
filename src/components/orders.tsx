"use client";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  List,
  Clock,
  MoreHorizontal,
  History,
  Trash2,
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { statusLabels, type Status, type Comanda } from "@/types";
import { duracaoAtendimento, previsaoServicos } from "@/lib/order-timing";
import { OrderProductivity } from "@/components/order-productivity";
import { canManage } from "@/lib/permissions";
import { money, dateLabel } from "@/lib/format";
import { apareceNaFilaOperacional, estadosFilaOperacional } from "@/lib/order-visibility";
function MenuComanda({ comanda, disabled, onView, onRemove }: {
  comanda: Comanda;
  disabled: boolean;
  onView: (id: string) => void;
  onRemove: (comanda: Comanda) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="icon" variant="ghost"
          className="size-8 shrink-0" aria-label={"Ações da comanda #" + comanda.numero}
          disabled={disabled}>
          <MoreHorizontal size={18} aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onView(comanda.id)}>
          <History size={15} /> Ver histórico
        </DropdownMenuItem>
        {comanda.status === "FINALIZADO" && (
          <DropdownMenuItem variant="destructive"
            onSelect={() => onRemove(comanda)}>
            <Trash2 size={15} /> Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Orders() {
  const { data, user, mutate, busy } = useStore(),
    a = useActions(),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("ATIVAS"),
    [view, setView] = useState("table"),
    [page, setPage] = useState(0),
    [now, setNow] = useState(0),
    [removing, setRemoving] = useState<string | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  // Remoção somente manual. Não excluir dados financeiros nem a vistoria.
  async function excluirDoPainel(o: Comanda) {
    if (o.status !== "FINALIZADO" || busy || removing) return;
    if (!window.confirm(
      "Excluir a comanda #" + o.numero + " do quadro de atendimento? " +
      "Ela será marcada como entregue. Os serviços, pagamento, PDF e vistoria " +
      "permanecerão disponíveis no histórico. Esta ação não apaga o registro."
    )) return;
    setRemoving(o.id);
    try {
      await mutate({ entity: "comandas", method: "PATCH", id: o.id,
        data: { status: "ENTREGUE" } });
    } finally {
      setRemoving(null);
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
  return (
    <>
      <PageTitle
        title="Comandas"
        description="As comandas finalizadas permanecem no quadro até a retirada manual pelo menu de três pontos."
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
            Finalizou a lavagem? A comanda continua visível. Use os três pontinhos (•••) para
            ver o histórico ou excluir manualmente do quadro. Nenhum registro é apagado.
          </p>
        </div>
        {view === "table" ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
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
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => a.showOrder(o.id)}>
                            Detalhes
                          </Button>
                          <MenuComanda comanda={o} disabled={busy || removing !== null}
                            onView={a.showOrder} onRemove={(o) => void excluirDoPainel(o)} />
                        </div>
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
          <div className="grid gap-4 bg-background p-5 lg:grid-cols-3">
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
                          <article key={o.id}
                            className="panel min-w-0 p-4 transition hover:border-primary/50 hover:shadow-md">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">#{o.numero}</span>
                              <div className="flex items-center gap-2">
                                <span className="plate">{v?.placa}</span>
                                <MenuComanda comanda={o} disabled={busy || removing !== null}
                            onView={a.showOrder} onRemove={(o) => void excluirDoPainel(o)} />
                              </div>
                            </div>
                            <button type="button" className="mt-3 block w-full text-left"
                              onClick={() => a.showOrder(o.id)}>
                              <p className="font-semibold">{v?.marca} {v?.modelo}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{c?.nome}</p>
                              <p className="my-4 text-sm">{o.itens.map((i) => i.nome).join(" + ")}</p>
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
                                <strong className="text-sm">{money(o.total)}</strong>
                              </div>
                            </button>
                          </article>
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
