"use client";
import { useMemo, useState } from "react";
import { ArrowRight, Clock3, History, Search, UsersRound } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { useActions } from "@/components/layout/app-shell";
import { PageTitle, Empty } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { dateLabel, money } from "@/lib/format";

// Apenas atendimentos efetivamente entregues entram no cadastro acumulado.
// Nenhum formulário de criação ou edição de ficha é necessário.
export function ServedCustomers() {
  const { data } = useStore();
  const actions = useActions();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const clients = useMemo(() => {
    if (!data) return [];
    return data.clientes.flatMap((client) => {
      const orders = data.comandas
        .filter((order) => order.clienteId === client.id && order.status === "ENTREGUE")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return orders.length ? [{
        ...client,
        orders,
        last: orders[0],
        spent: orders.reduce((sum, order) => sum + order.total, 0),
      }] : [];
    }).sort((a, b) => b.last.createdAt.localeCompare(a.last.createdAt));
  }, [data]);
  if (!data) return null;
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const matches = clients.filter((client) =>
    !normalized ||
    [client.nome, client.telefone, ...client.orders.map((o) => o.placa || "")]
      .some((value) => value.toLocaleLowerCase("pt-BR").includes(normalized)),
  );
  return (
    <div className="space-y-6">
      <PageTitle
        title="Clientes atendidos"
        description="Histórico formado automaticamente após a entrega. A equipe não precisa cadastrar clientes ou veículos antes de atender."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="panel flex items-center gap-4 p-5">
          <div className="rounded-xl bg-primary/10 p-3 text-primary"><UsersRound size={23}/></div>
          <div><p className="text-xs text-muted-foreground">Clientes com serviço entregue</p><p className="text-2xl font-bold">{clients.length}</p></div>
        </div>
        <div className="panel flex items-center gap-4 p-5">
          <div className="rounded-xl bg-primary/10 p-3 text-primary"><History size={23}/></div>
          <div><p className="text-xs text-muted-foreground">Serviços entregues registrados</p><p className="text-2xl font-bold">{clients.reduce((sum, c) => sum + c.orders.length, 0)}</p></div>
        </div>
      </div>
      <div className="panel overflow-hidden">
        <div className="border-b border-border p-4 sm:p-5">
          <label htmlFor="served-search" className="mb-2 block text-xs font-semibold">Buscar no histórico</label>
          <div className="relative max-w-lg">
            <Search size={16} className="pointer-events-none absolute left-3 top-3 text-muted-foreground"/>
            <Input id="served-search" value={query} onChange={(e) => setQuery(e.target.value)}
              className="h-11 pl-10" placeholder="Nome, telefone ou placa do atendimento" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            O registro é criado automaticamente somente após a entrega. Clientes agendados ou cancelados não entram nesta lista.
          </p>
        </div>
        {!matches.length ? (
          <div className="p-6"><Empty title="Nenhum cliente atendido encontrado" text="Quando um serviço for entregue, o histórico aparecerá aqui automaticamente." /></div>
        ) : (
          <div className="divide-y divide-border">
            {matches.map((client) => (
              <article key={client.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{client.nome}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{client.telefone || "Sem telefone"}</p>
                    <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock3 size={13}/> Último atendimento: {dateLabel(client.last.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:text-right">
                    <div><p className="text-xs text-muted-foreground">{client.orders.length} {client.orders.length === 1 ? "serviço entregue" : "serviços entregues"}</p><p className="font-bold">{money(client.spent)}</p></div>
                    <Button type="button" size="sm" variant="outline" aria-expanded={expanded === client.id}
                      onClick={() => setExpanded((old) => old === client.id ? null : client.id)}>
                      {expanded === client.id ? "Ocultar" : "Ver histórico"} <ArrowRight size={14}/>
                    </Button>
                  </div>
                </div>
                {expanded === client.id && (
                  <div className="mt-4 space-y-2 border-t border-border pt-4">
                    {client.orders.map((order) => (
                      <button key={order.id} type="button" onClick={() => actions.showOrder(order.id)}
                        className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 p-3 text-left transition hover:border-primary/40 hover:bg-muted">
                        <span className="text-sm font-semibold">#{order.numero} · {order.placa || data.veiculos.find(v => v.id === order.veiculoId)?.placa || "Veículo"}<span className="ml-2 font-normal text-muted-foreground">{dateLabel(order.createdAt)}</span></span>
                        <span className="text-sm font-semibold">{money(order.total)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
