"use client";
import { useState } from "react";
import {
  LayoutGrid,
  List,
  Clock,
  CarFront,
  CheckCircle2,
  MoreHorizontal,
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
import { money, dateLabel } from "@/lib/format";
export function Orders() {
  const { data, user } = useStore(),
    a = useActions(),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("ATIVAS"),
    [view, setView] = useState("table"),
    [page, setPage] = useState(0);
  if (!data) return null;
  const filtered = data.comandas
    .filter((o) => {
      const c = data.clientes.find((c) => c.id === o.clienteId),
        v = data.veiculos.find((v) => v.id === o.veiculoId),
        q = search.toLowerCase();
      return (
        (status === "TODAS" || status === "ATIVAS"
          ? status === "TODAS" ||
            ["AGUARDANDO", "EM_LAVAGEM", "FINALIZADO"].includes(o.status)
          : o.status === status) &&
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
        description="Organize a fila e acompanhe cada atendimento."
        action={user?.role !== "LAVADOR" ? a.newOrder : undefined}
        actionLabel="Nova comanda"
      />
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
          <div className="grid gap-4 bg-background p-5 lg:grid-cols-3">
            {(["AGUARDANDO", "EM_LAVAGEM", "FINALIZADO"] as Status[]).map(
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
                            onClick={() => a.showOrder(o.id)}
                            className="panel block w-full p-4 text-left hover:border-primary/50 hover:shadow-md"
                          >
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">
                                #{o.numero}
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
