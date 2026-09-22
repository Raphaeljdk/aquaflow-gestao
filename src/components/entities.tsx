"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Pencil,
  Trash2,
  History,
  Plus,
  Clock3,
  Sparkles,
  CarFront,
  Users,
  Mail,
  Phone,
  Loader2,
  UserRound,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/hooks/use-store";
import { useActions } from "./layout/app-shell";
import {
  PageTitle,
  SearchInput,
  Choice,
  Picker,
  Avatar,
  Empty,
  StatusBadge,
} from "./common";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./ui/sheet";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import {
  clienteSchema,
  veiculoSchema,
  servicoSchema,
  funcionarioSchema,
} from "@/lib/validations";
import { money, dateLabel } from "@/lib/format";
import { canManage } from "@/lib/permissions";
import { roleLabels, type Entity } from "@/types";
import { ErrorText } from "./forms/order-form";
type Kind = "clientes" | "veiculos" | "servicos" | "funcionarios";
type RecordValue = Record<string, any>;
const meta = {
  clientes: {
    title: "Clientes",
    single: "cliente",
    description: "Relacionamentos bem cuidados começam por aqui.",
    add: "Novo cliente",
  },
  veiculos: {
    title: "Veículos",
    single: "veículo",
    description: "Cada veículo, seu proprietário e todo o histórico.",
    add: "Novo veículo",
  },
  servicos: {
    title: "Catálogo de serviços",
    single: "serviço",
    description: "Seus cuidados, preços e tempos de atendimento.",
    add: "Novo serviço",
  },
  funcionarios: {
    title: "Sua equipe",
    single: "funcionário",
    description: "Pessoas que fazem cada atendimento brilhar.",
    add: "Novo funcionário",
  },
};
export function EntityPage({ kind }: { kind: Kind }) {
  const { data, user, mutate, busy } = useStore(),
    params = useSearchParams(),
    actions = useActions(),
    [search, setSearch] = useState(params.get("q") ?? ""),
    [edit, setEdit] = useState<RecordValue | null>(null),
    [remove, setRemove] = useState<RecordValue | null>(null),
    [history, setHistory] = useState<RecordValue | null>(null),
    [page, setPage] = useState(0),
    [includeInactive, setIncludeInactive] = useState(false);
  useEffect(() => {
    setSearch(params.get("q") ?? "");
    setPage(0);
  }, [params]);
  if (!data || !user) return null;
  const m = meta[kind],
    canEdit =
      !["servicos", "funcionarios"].includes(kind) || canManage(user.role);
  const rows = (data[kind] as unknown as RecordValue[]).filter((r) => {
    const q = search.toLowerCase();
    const text =
      kind === "clientes"
        ? [
            r.nome,
            r.telefone,
            r.email,
            ...data.veiculos
              .filter((v) => v.clienteId === r.id)
              .map((v) => v.placa),
          ].join(" ")
        : kind === "veiculos"
          ? [
              r.placa,
              r.marca,
              r.modelo,
              data.clientes.find((c) => c.id === r.clienteId)?.nome,
            ].join(" ")
          : r.nome;
    return (
      text.toLowerCase().includes(q) && (includeInactive || r.ativo !== false)
    );
  });
  const historyOrders = history
    ? data.comandas
        .filter((o) =>
          kind === "clientes"
            ? o.clienteId === history.id
            : o.veiculoId === history.id,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
  const RowActions = ({ r }: { r: RecordValue }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          aria-label={"Ações de " + (r.nome ?? r.placa)}
        >
          <MoreHorizontal size={17} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(kind === "clientes" || kind === "veiculos") && (
          <DropdownMenuItem onClick={() => setHistory(r)}>
            <History size={14} />
            Ver histórico
          </DropdownMenuItem>
        )}
        {canEdit && (
          <>
            <DropdownMenuItem onClick={() => setEdit(r)}>
              <Pencil size={14} />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setRemove(r)}
            >
              <Trash2 size={14} />
              {kind === "funcionarios" || kind === "servicos"
                ? "Desativar"
                : "Excluir"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  return (
    <>
      <PageTitle
        title={m.title}
        description={m.description}
        action={canEdit ? () => setEdit({}) : undefined}
        actionLabel={m.add}
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(0);
            }}
            placeholder={
              kind === "clientes"
                ? "Buscar por nome, telefone ou placa"
                : "Buscar " + m.single + "..."
            }
          />
        </div>
        <div className="flex items-center gap-3">
          {["servicos", "funcionarios"].includes(kind) && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                checked={includeInactive}
                onCheckedChange={setIncludeInactive}
              />
              Mostrar inativos
            </label>
          )}
          <span className="text-xs text-muted-foreground">
            {rows.length} registros
          </span>
        </div>
      </div>
      {kind === "servicos" ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r, i) => (
            <article
              key={r.id}
              className={"panel p-5 " + (!r.ativo ? "opacity-60" : "")}
            >
              <div className="mb-5 flex justify-between">
                <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
                  {i % 2 === 0 ? <DropletIcon /> : <Sparkles size={22} />}
                </div>
                <RowActions r={r} />
              </div>
              <h2 className="text-base font-semibold">{r.nome}</h2>
              <p className="mt-2 min-h-10 text-sm leading-relaxed text-muted-foreground">
                {r.descricao}
              </p>
              <div className="mt-6 flex items-end justify-between border-t border-border pt-4">
                <strong className="text-2xl font-semibold tracking-tight">
                  {money(r.preco)}
                </strong>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 size={14} />
                  {r.duracaoMin} min
                </span>
              </div>
              {!r.ativo && (
                <p className="mt-3 text-xs text-destructive">
                  Serviço desativado
                </p>
              )}
            </article>
          ))}
        </div>
      ) : kind === "funcionarios" ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r, i) => {
            const orders = data.comandas.filter(
              (o) =>
                o.funcionarioId === r.id &&
                o.finalizadoEm &&
                dateLabel(o.finalizadoEm, "yyyy-MM") ===
                  dateLabel(new Date(), "yyyy-MM"),
            );
            return (
              <article
                key={r.id}
                className={"panel p-5 " + (!r.ativo ? "opacity-60" : "")}
              >
                <div className="flex justify-between">
                  <Avatar name={r.nome} index={i} />
                  <RowActions r={r} />
                </div>
                <h2 className="mt-4 text-base font-semibold">{r.nome}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {roleLabels[r.cargo as keyof typeof roleLabels]} ·{" "}
                  {r.ativo ? "Ativo" : "Inativo"}
                </p>
                <p className="mt-4 flex items-center gap-2 truncate text-xs text-muted-foreground">
                  <Mail size={14} />
                  {r.email || "E-mail não informado"}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Atendimentos no mês
                    </p>
                    <p className="mt-2 text-xl font-semibold">
                      {orders.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Comissão no mês · {r.comissao}%
                    </p>
                    <p className="mt-2 text-xl font-semibold text-primary">
                      {money(orders.reduce((n, o) => n + o.comissao, 0))}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">
                  {kind === "clientes" ? "Cliente" : "Veículo"}
                </TableHead>
                <TableHead>
                  {kind === "clientes" ? "Contato" : "Placa"}
                </TableHead>
                <TableHead>
                  {kind === "clientes" ? "Veículos" : "Proprietário"}
                </TableHead>
                <TableHead>
                  {kind === "clientes" ? "Último atendimento" : "Detalhes"}
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(page * 12, page * 12 + 12).map((r, i) => {
                const last = data.comandas
                  .filter((o) =>
                    kind === "clientes"
                      ? o.clienteId === r.id
                      : o.veiculoId === r.id,
                  )
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
                return (
                  <TableRow key={r.id}>
                    <TableCell className="py-5 pl-5">
                      <button
                        onClick={() => setHistory(r)}
                        className="flex items-center gap-3 text-left"
                      >
                        {kind === "clientes" ? (
                          <Avatar name={r.nome} index={i} />
                        ) : (
                          <div className="rounded-xl bg-muted p-2.5 text-muted-foreground">
                            <CarFront size={20} />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold">
                            {kind === "clientes"
                              ? r.nome
                              : r.marca + " " + r.modelo}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {kind === "clientes"
                              ? r.cpfCnpj || "Pessoa física / jurídica"
                              : r.tipo === "MOTO"
                                ? "Moto"
                                : r.tipo === "CAMINHONETE"
                                  ? "Caminhonete"
                                  : "Carro"}
                          </p>
                        </div>
                      </button>
                    </TableCell>
                    <TableCell>
                      {kind === "clientes" ? (
                        <>
                          <p className="text-sm">{r.telefone}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {r.email || "Sem e-mail"}
                          </p>
                        </>
                      ) : (
                        <span className="plate">{r.placa}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {kind === "clientes"
                        ? data.veiculos
                            .filter((v) => v.clienteId === r.id)
                            .map((v) => v.modelo)
                            .join(", ") || "Nenhum veículo"
                        : data.clientes.find((c) => c.id === r.clienteId)?.nome}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {kind === "clientes"
                        ? last
                          ? dateLabel(last.createdAt, "dd MMM yyyy")
                          : "Primeiro atendimento"
                        : r.cor + " · " + r.ano}
                    </TableCell>
                    <TableCell>
                      <RowActions r={r} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {!rows.length && <Empty />}
          <div className="flex items-center justify-between border-t border-border p-4 text-xs text-muted-foreground">
            <span>{rows.length} registros</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!page}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span>
                {page + 1} / {Math.max(1, Math.ceil(rows.length / 12))}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={(page + 1) * 12 >= rows.length}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      )}
      {!!edit && (
        <EntityEditor kind={kind} record={edit} onClose={() => setEdit(null)} />
      )}
      <AlertDialog open={!!remove} onOpenChange={(v) => !v && setRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {["servicos", "funcionarios"].includes(kind)
                ? "Desativar"
                : "Excluir"}{" "}
              {m.single}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {["servicos", "funcionarios"].includes(kind)
                ? "O registro deixará de aparecer nos novos atendimentos. O histórico será preservado."
                : "A exclusão é definitiva. Registros com histórico ou vínculos não podem ser excluídos."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="bg-destructive text-white"
              onClick={async (e) => {
                e.preventDefault();
                if (
                  remove &&
                  (await mutate({
                    entity: kind,
                    method: "DELETE",
                    id: remove.id,
                  }))
                )
                  setRemove(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Sheet open={!!history} onOpenChange={(v) => !v && setHistory(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader className="border-b border-border p-6">
            <SheetTitle>
              {kind === "clientes"
                ? history?.nome
                : history?.marca + " " + history?.modelo}
            </SheetTitle>
            <SheetDescription>
              Histórico completo de atendimentos
            </SheetDescription>
          </SheetHeader>
          <div className="p-6">
            <div className="mb-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted p-4">
                <p className="text-xs text-muted-foreground">Atendimentos</p>
                <p className="mt-2 text-2xl font-semibold">
                  {historyOrders.length}
                </p>
              </div>
              <div className="rounded-xl bg-accent p-4">
                <p className="text-xs text-muted-foreground">Total pago</p>
                <p className="mt-2 text-2xl font-semibold text-primary">
                  {money(
                    historyOrders
                      .filter((o) => o.finalizadoEm)
                      .reduce((n, o) => n + o.total, 0),
                  )}
                </p>
              </div>
            </div>
            {historyOrders.length === 0 ? (
              <Empty
                title="Histórico vazio"
                text="As comandas deste cadastro aparecerão aqui."
              />
            ) : (
              historyOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    setHistory(null);
                    actions.showOrder(o.id);
                  }}
                  className="mb-3 block w-full rounded-xl border border-border p-4 text-left hover:bg-muted"
                >
                  <div className="flex justify-between gap-3">
                    <strong className="text-sm">#{o.numero}</strong>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="mt-3 text-sm">
                    {o.itens.map((i) => i.nome).join(" + ")}
                  </p>
                  <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                    <span>{dateLabel(o.createdAt)}</span>
                    <strong className="text-foreground">
                      {money(o.total)}
                    </strong>
                  </div>
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
function DropletIcon() {
  return <CarFront size={22} />;
}
function EntityEditor({
  kind,
  record,
  onClose,
}: {
  kind: Kind;
  record: RecordValue;
  onClose: () => void;
}) {
  const { data, user, mutate, busy } = useStore();
  const defaults: Record<Kind, RecordValue> = {
    clientes: { nome: "", telefone: "", email: "", cpfCnpj: "", endereco: "" },
    veiculos: {
      clienteId: "",
      placa: "",
      marca: "",
      modelo: "",
      cor: "",
      ano: new Date().getFullYear(),
      tipo: "CARRO",
    },
    servicos: {
      nome: "",
      descricao: "",
      preco: 0,
      duracaoMin: 30,
      ativo: true,
    },
    funcionarios: {
      nome: "",
      email: "",
      cargo: "LAVADOR",
      comissao: 0,
      ativo: true,
      password: "",
    },
  };
  const schemas = {
    clientes: clienteSchema,
    veiculos: veiculoSchema,
    servicos: servicoSchema,
    funcionarios: funcionarioSchema,
  };
  const form = useForm<RecordValue>({
    resolver: zodResolver(schemas[kind]),
    defaultValues: { ...defaults[kind], ...record, password: "" },
  });
  if (!data) return null;
  const input = (
    name: string,
    label: string,
    type = "text",
    extra: Record<string, unknown> = {},
  ) => (
    <div className="space-y-2" key={name}>
      <Label htmlFor={"f-" + name}>{label}</Label>
      <Input id={"f-" + name} type={type} {...extra} {...form.register(name)} />
      <ErrorText message={form.formState.errors[name]?.message as string} />
    </div>
  );
  const select = (
    name: string,
    label: string,
    options: { value: string; label: string }[],
  ) => (
    <div className="space-y-2" key={name}>
      <Label>{label}</Label>
      <Controller
        name={name}
        control={form.control}
        render={({ field }) => (
          <Choice
            value={field.value}
            onChange={field.onChange}
            options={options}
            placeholder={label}
          />
        )}
      />
      <ErrorText message={form.formState.errors[name]?.message as string} />
    </div>
  );
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>
            {record.id ? "Editar " + meta[kind].single : meta[kind].add}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados para manter sua operação organizada.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            if (
              await mutate({
                entity: kind,
                method: record.id ? "PATCH" : "POST",
                id: record.id,
                data: values,
              })
            )
              onClose();
          })}
          className="space-y-5"
        >
          {kind === "clientes" && (
            <>
              {input("nome", "Nome completo / razão social")}
              <div className="grid gap-4 sm:grid-cols-2">
                {input("telefone", "Telefone com DDD", "tel")}
                {input("cpfCnpj", "CPF / CNPJ (opcional)")}
              </div>
              {input("email", "E-mail (opcional)", "email")}
              {input("endereco", "Endereço (opcional)")}
            </>
          )}
          {kind === "veiculos" && (
            <>
              <div className="space-y-2">
                <Label>Proprietário</Label>
                <Controller
                  name="clienteId"
                  control={form.control}
                  render={({ field }) => (
                    <Picker
                      value={field.value}
                      onChange={field.onChange}
                      options={data.clientes.map((c) => ({
                        value: c.id,
                        label: c.nome,
                      }))}
                      placeholder="Buscar cliente"
                    />
                  )}
                />
                <ErrorText
                  message={form.formState.errors.clienteId?.message as string}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {input("placa", "Placa", "text", {
                  placeholder: "ABC1D23",
                  maxLength: 8,
                })}
                {select("tipo", "Tipo do veículo", [
                  { value: "CARRO", label: "Carro" },
                  { value: "MOTO", label: "Moto" },
                  { value: "CAMINHONETE", label: "Caminhonete" },
                ])}
                {input("marca", "Marca")}
                {input("modelo", "Modelo")}
                {input("cor", "Cor")}
                {input("ano", "Ano", "number", {
                  min: 1950,
                  max: new Date().getFullYear() + 1,
                })}
              </div>
            </>
          )}
          {kind === "servicos" && (
            <>
              {input("nome", "Nome do serviço")}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" {...form.register("descricao")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {input("preco", "Preço (R$)", "number", {
                  min: 0.01,
                  step: 0.01,
                })}
                {input("duracaoMin", "Duração (minutos)", "number", {
                  min: 15,
                  step: 15,
                })}
              </div>
            </>
          )}
          {kind === "funcionarios" && (
            <>
              {input("nome", "Nome completo")}
              {input("email", "E-mail de acesso", "email")}
              <div className="grid grid-cols-2 gap-4">
                {select(
                  "cargo",
                  "Perfil",
                  Object.entries(roleLabels)
                    .filter(
                      ([r]) =>
                        user?.role === "ADMIN" ||
                        ["ATENDENTE", "LAVADOR"].includes(r),
                    )
                    .map(([value, label]) => ({ value, label })),
                )}
                {input("comissao", "Comissão (%)", "number", {
                  min: 0,
                  max: 100,
                  step: 0.1,
                })}
              </div>
              {input(
                "password",
                record.id
                  ? "Nova senha (opcional)"
                  : "Senha de acesso (opcional)",
                "password",
                { autoComplete: "new-password" },
              )}
              <p className="text-xs text-muted-foreground">
                Informe e-mail e senha com 10 caracteres para habilitar o login.
                Sem senha, será criado apenas o cadastro operacional.
              </p>
            </>
          )}
          {["servicos", "funcionarios"].includes(kind) && (
            <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              Cadastro ativo
              <Controller
                name="ativo"
                control={form.control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </label>
          )}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 size={16} className="animate-spin" />}Salvar{" "}
              {meta[kind].single}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
