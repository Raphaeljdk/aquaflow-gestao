"use client";
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CarFront,
  Check,
  Clock,
  AlertCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Choice, Picker, StatusBadge } from "@/components/common";
import { comandaSchema } from "@/lib/validations";
import { useStore } from "@/hooks/use-store";
import { money, dateLabel } from "@/lib/format";
import { activeStatus } from "@/lib/domain";
import { paymentLabels, type Status } from "@/types";
type OrderValues = {
  clienteId: string;
  veiculoId: string;
  servicoIds: string[];
  funcionarioId: string;
  desconto: number;
  observacoes: string;
};
export function OrderForm({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data, busy, mutate } = useStore();
  const form = useForm<OrderValues>({
    resolver: zodResolver(comandaSchema),
    defaultValues: {
      clienteId: "",
      veiculoId: "",
      servicoIds: [],
      funcionarioId: "",
      desconto: 0,
      observacoes: "",
    },
  });
  useEffect(() => {
    if (open)
      form.reset({
        clienteId: "",
        veiculoId: "",
        servicoIds: [],
        funcionarioId: "",
        desconto: 0,
        observacoes: "",
      });
  }, [open, form]);
  if (!data) return null;
  const v = form.watch(),
    selected = data.servicos.filter((s) => v.servicoIds.includes(s.id)),
    subtotal = selected.reduce((n, s) => n + s.preco, 0),
    duplicate = data.comandas.some(
      (o) => o.veiculoId === v.veiculoId && activeStatus.includes(o.status),
    );
  const submit = form.handleSubmit(async (values) => {
    if (await mutate({ entity: "comandas", method: "POST", data: values }))
      onClose();
  });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-[640px]">
        <DialogHeader className="border-b border-border p-6">
          <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
            <CarFront size={22} />
          </div>
          <DialogTitle className="text-xl">Nova comanda</DialogTitle>
          <DialogDescription>
            Receba o veículo e organize o próximo atendimento.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5 p-6 pt-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Controller
                name="clienteId"
                control={form.control}
                render={({ field }) => (
                  <Picker
                    value={field.value}
                    onChange={(s) => {
                      field.onChange(s);
                      form.setValue("veiculoId", "");
                    }}
                    options={data.clientes.map((c) => ({
                      value: c.id,
                      label: c.nome + " · " + c.telefone,
                    }))}
                    placeholder="Buscar cliente"
                  />
                )}
              />
              <ErrorText message={form.formState.errors.clienteId?.message} />
            </div>
            <div className="space-y-2">
              <Label>Veículo</Label>
              <Controller
                name="veiculoId"
                control={form.control}
                render={({ field }) => (
                  <Choice
                    value={field.value}
                    onChange={field.onChange}
                    options={data.veiculos
                      .filter((c) => c.clienteId === v.clienteId)
                      .map((c) => ({
                        value: c.id,
                        label: c.placa + " · " + c.modelo,
                      }))}
                    placeholder="Selecione o veículo"
                  />
                )}
              />
              <ErrorText message={form.formState.errors.veiculoId?.message} />
            </div>
          </div>
          {duplicate && (
            <p className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <AlertCircle size={18} />
              Este veículo já está na fila ou aguarda retirada.
            </p>
          )}
          <div>
            <Label className="mb-3">Serviços</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.servicos
                .filter((s) => s.ativo)
                .map((s) => (
                  <label
                    key={s.id}
                    className={
                      "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition " +
                      (v.servicoIds.includes(s.id)
                        ? "border-primary bg-accent/60"
                        : "border-border hover:bg-muted")
                    }
                  >
                    <Checkbox
                      checked={v.servicoIds.includes(s.id)}
                      onCheckedChange={(checked) =>
                        form.setValue(
                          "servicoIds",
                          checked
                            ? [...v.servicoIds, s.id]
                            : v.servicoIds.filter((x) => x !== s.id),
                          { shouldValidate: true },
                        )
                      }
                    />
                    <div className="flex-1">
                      <span className="block text-sm font-medium">
                        {s.nome}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {s.duracaoMin} min
                      </span>
                    </div>
                    <span className="text-sm font-semibold">
                      {money(s.preco)}
                    </span>
                  </label>
                ))}
            </div>
            <ErrorText message={form.formState.errors.servicoIds?.message} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Lavador responsável</Label>
              <Controller
                name="funcionarioId"
                control={form.control}
                render={({ field }) => (
                  <Choice
                    value={field.value || "unassigned"}
                    onChange={(v) =>
                      field.onChange(v === "unassigned" ? "" : v)
                    }
                    options={[
                      { value: "unassigned", label: "Atribuir depois" },
                      ...data.funcionarios
                        .filter((f) => f.ativo && f.cargo === "LAVADOR")
                        .map((f) => ({ value: f.id, label: f.nome })),
                    ]}
                    placeholder="Selecione o lavador"
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Desconto (R$)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                step=".01"
                {...form.register("desconto", { valueAsNumber: true })}
              />
              <ErrorText message={form.formState.errors.desconto?.message} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="order-notes">Observações</Label>
            <Textarea
              id="order-notes"
              placeholder="Cuidados especiais, objetos no veículo..."
              {...form.register("observacoes")}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted p-4">
            <div>
              <p className="text-sm text-muted-foreground">Total da comanda</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={12} />
                {selected.reduce((n, s) => n + s.duracaoMin, 0)} min estimados
              </p>
            </div>
            <strong className="text-2xl tracking-tight text-primary">
              {money(Math.max(0, subtotal - (v.desconto || 0)))}
            </strong>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={busy || duplicate} type="submit">
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              Abrir comanda
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function ErrorText({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1 text-xs text-destructive">{message}</p>
  ) : null;
}
export function OrderDetail({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const { data, user, mutate, busy } = useStore(),
    [payment, setPayment] = useState(""),
    [washer, setWasher] = useState(""),
    [cancel, setCancel] = useState(false);
  const o = data?.comandas.find((o) => o.id === id);
  useEffect(() => {
    setPayment(o?.formaPagamento ?? "");
    setWasher(o?.funcionarioId ?? "");
  }, [id, o?.formaPagamento, o?.funcionarioId]);
  const c = data?.clientes.find((c) => c.id === o?.clienteId),
    v = data?.veiculos.find((v) => v.id === o?.veiculoId);
  const transition = async (status: Status) => {
    if (!o) return;
    const payload: Record<string, unknown> = { status };
    if (user?.role !== "LAVADOR") {
      payload.funcionarioId = washer || null;
      payload.formaPagamento = payment || null;
    }
    if (
      await mutate({
        entity: "comandas",
        method: "PATCH",
        id: o.id,
        data: payload,
      })
    ) {
      if (status === "CANCELADO") setCancel(false);
    }
  };
  return (
    <>
      <Sheet open={!!id} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[470px]">
          <SheetHeader className="border-b border-border p-6">
            <SheetTitle className="text-xl">Comanda #{o?.numero}</SheetTitle>
            <SheetDescription>
              {o
                ? dateLabel(o.createdAt, "dd 'de' MMMM 'às' HH:mm")
                : "Detalhes do atendimento"}
            </SheetDescription>
          </SheetHeader>
          {o && data && (
            <div className="space-y-6 p-6">
              <StatusBadge status={o.status} />
              <div className="rounded-xl bg-muted p-4">
                <div className="mb-3 flex items-center gap-3">
                  <CarFront size={30} className="text-primary" />
                  <div>
                    <h3 className="font-semibold">
                      {v?.marca} {v?.modelo}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {v?.cor} · {v?.ano}
                    </p>
                  </div>
                </div>
                <span className="plate">{v?.placa}</span>
                <p className="mt-4 border-t border-border pt-3 text-sm">
                  {c?.nome}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {c?.telefone}
                  </span>
                </p>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold">Serviços</h3>
                {o.itens.map((i, n) => (
                  <div key={n} className="flex justify-between py-2 text-sm">
                    <span>
                      {i.quantidade}× {i.nome}
                    </span>
                    <span>{money(i.preco * i.quantidade)}</span>
                  </div>
                ))}
                {o.desconto > 0 && (
                  <div className="flex justify-between py-2 text-sm text-emerald-600">
                    <span>Desconto</span>
                    <span>− {money(o.desconto)}</span>
                  </div>
                )}
                <div className="mt-3 flex justify-between border-t border-border pt-4 font-semibold">
                  <span>Total</span>
                  <span className="text-xl text-primary">{money(o.total)}</span>
                </div>
              </div>
              {o.observacoes && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Observações</h3>
                  <p className="text-sm text-muted-foreground">
                    {o.observacoes}
                  </p>
                </div>
              )}
              {["AGUARDANDO", "EM_LAVAGEM"].includes(o.status) &&
                user?.role !== "LAVADOR" && (
                  <div className="space-y-2">
                    <Label>Lavador responsável</Label>
                    <Choice
                      value={washer}
                      onChange={setWasher}
                      options={data.funcionarios
                        .filter((f) => f.ativo && f.cargo === "LAVADOR")
                        .map((f) => ({ value: f.id, label: f.nome }))}
                      placeholder="Atribua um lavador"
                    />
                  </div>
                )}
              {o.status === "EM_LAVAGEM" && user?.role !== "LAVADOR" && (
                <div className="space-y-2">
                  <Label>Forma de pagamento</Label>
                  <Choice
                    value={payment}
                    onChange={setPayment}
                    options={Object.entries(paymentLabels).map(
                      ([value, label]) => ({ value, label }),
                    )}
                    placeholder="Selecione o pagamento"
                  />
                  <p className="text-xs text-muted-foreground">
                    Confirme o recebimento antes de finalizar.
                  </p>
                </div>
              )}
              {o.finalizadoEm && (
                <div className="rounded-lg border border-border p-3 text-sm">
                  <p>
                    Pagamento:{" "}
                    <strong>
                      {o.formaPagamento ? paymentLabels[o.formaPagamento] : "—"}
                    </strong>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Finalizado em {dateLabel(o.finalizadoEm)} · Comissão{" "}
                    {money(o.comissao)}
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {o.status === "AGUARDANDO" && (
                  <Button
                    disabled={busy}
                    onClick={() => void transition("EM_LAVAGEM")}
                  >
                    Iniciar lavagem
                    <ArrowRight size={15} />
                  </Button>
                )}
                {o.status === "EM_LAVAGEM" && user?.role !== "LAVADOR" && (
                  <Button
                    disabled={busy || !payment}
                    onClick={() => void transition("FINALIZADO")}
                  >
                    Confirmar pagamento e finalizar
                    <Check size={15} />
                  </Button>
                )}
                {o.status === "FINALIZADO" && user?.role !== "LAVADOR" && (
                  <Button
                    disabled={busy}
                    onClick={() => void transition("ENTREGUE")}
                  >
                    Confirmar entrega
                    <Check size={15} />
                  </Button>
                )}
                {["AGUARDANDO", "EM_LAVAGEM"].includes(o.status) &&
                  user?.role !== "LAVADOR" && (
                    <Button
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setCancel(true)}
                    >
                      Cancelar comanda
                    </Button>
                  )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <AlertDialog open={cancel} onOpenChange={setCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta comanda?</AlertDialogTitle>
            <AlertDialogDescription>
              O veículo sairá da fila. O registro será mantido no histórico, sem
              gerar faturamento ou comissão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void transition("CANCELADO");
              }}
              className="bg-destructive text-white"
            >
              Cancelar comanda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
