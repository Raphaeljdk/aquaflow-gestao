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
  QrCode,
  CreditCard,
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
import { VehicleInspection } from "@/components/vehicle-inspection";
import { pixPayload } from "@/lib/pix";
import { normalizeWhatsappPhone } from "@/lib/whatsapp";
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
  initialClientId,
  onClose,
}: {
  open: boolean;
  initialClientId?: string;
  onClose: () => void;
}) {
  const { data, busy, mutate, refresh } = useStore();
  const [mode, setMode] = useState<"rapido" | "cadastrado">("rapido");
  const [quick, setQuick] = useState({
    nomeCliente: "",
    telefoneCliente: "",
    placa: "",
    tipo: "CARRO",
  });
  const [quickBusy, setQuickBusy] = useState(false);
  const [quickError, setQuickError] = useState("");
  const form = useForm<OrderValues>({
    resolver: zodResolver(comandaSchema),
    defaultValues: {
      clienteId: initialClientId ?? "",
      veiculoId: "",
      servicoIds: [],
      funcionarioId: "",
      desconto: 0,
      observacoes: "",
    },
  });
  useEffect(() => {
    if (!open) return;
    setMode("rapido");
    setQuick({
      nomeCliente: "",
      telefoneCliente: "",
      placa: "",
      tipo: "CARRO",
    });
    setQuickError("");
  }, [open, initialClientId]);
  useEffect(() => {
    if (!open) return;
    const firstVehicle =
      data?.veiculos.find((vehicle) => vehicle.clienteId === initialClientId)
        ?.id ?? "";
    form.reset({
      clienteId: initialClientId ?? "",
      veiculoId: firstVehicle,
      servicoIds: [],
      funcionarioId: "",
      desconto: 0,
      observacoes: "",
    });
  }, [open, initialClientId, data, form]);
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
  async function submitQuick() {
    if (quickBusy) return;
    setQuickError("");
    const values = form.getValues();
    if (values.servicoIds.length < 1) {
      setQuickError("Selecione ao menos um serviço para iniciar.");
      return;
    }
    setQuickBusy(true);
    try {
      const response = await fetch("/api/atendimentos-rapidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeCliente: quick.nomeCliente,
          telefoneCliente: quick.telefoneCliente,
          placa: quick.placa,
          tipo: quick.tipo,
          servicoIds: values.servicoIds,
          funcionarioId: values.funcionarioId,
          desconto: values.desconto,
          observacoes: values.observacoes,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setQuickError(body.error ?? "Não foi possível iniciar o atendimento.");
        return;
      }
      await refresh();
      onClose();
    } catch {
      setQuickError(
        "Falha de conexão. Verifique sua internet e tente novamente.",
      );
    } finally {
      setQuickBusy(false);
    }
  }

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
        <form
          onSubmit={
            mode === "rapido"
              ? (event) => {
                  event.preventDefault();
                  void submitQuick();
                }
              : submit
          }
          className="space-y-5 p-4 pt-0 sm:p-6 sm:pt-0"
        >
          {mode === "rapido" ? (
            <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-bold">Identificação na chegada</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Atendimento avulso: informe o tipo e a placa, escolha os serviços e comece.
                  Nome e WhatsApp são opcionais e podem ser completados depois.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-client-name">Nome (opcional)</Label>
                <Input
                  id="quick-client-name"
                  minLength={2}
                  maxLength={120}
                  placeholder="Cliente de passagem — pode deixar vazio"
                  value={quick.nomeCliente}
                  onChange={(event) =>
                    setQuick({ ...quick, nomeCliente: event.target.value })
                  }
                  className="h-11 text-base sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-phone">
                  WhatsApp com DDD (opcional, para avisos)
                </Label>
                <Input
                  id="quick-phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  maxLength={20}
                  value={quick.telefoneCliente}
                  onChange={(event) =>
                    setQuick({ ...quick, telefoneCliente: event.target.value })
                  }
                  className="h-11 text-base sm:text-sm"
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Sem telefone não há aviso automático. Se preencher nome e WhatsApp,
                  o contato será guardado no histórico somente após a entrega.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quick-vehicle-type">Tipo de veículo</Label>
                  <select
                    id="quick-vehicle-type"
                    value={quick.tipo}
                    onChange={(event) =>
                      setQuick({ ...quick, tipo: event.target.value })
                    }
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base sm:text-sm"
                  >
                    <option value="CARRO">Carro</option>
                    <option value="MOTO">Moto</option>
                    <option value="CAMINHONETE">Caminhonete</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick-license-plate">Placa</Label>
                  <Input
                    id="quick-license-plate"
                    required
                    minLength={7}
                    maxLength={8}
                    placeholder="ABC1D23"
                    value={quick.placa}
                    onChange={(event) =>
                      setQuick({
                        ...quick,
                        placa: event.target.value.toUpperCase(),
                      })
                    }
                    className="h-11 uppercase text-base sm:text-sm"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Controller
                  name="clienteId"
                  control={form.control}
                  render={({ field }) => (
                    <Picker
                      value={field.value}
                      onChange={(clientId) => {
                        field.onChange(clientId);
                        const firstVehicle = data.veiculos.find(
                          (vehicle) => vehicle.clienteId === clientId,
                        );
                        form.setValue("veiculoId", firstVehicle?.id ?? "");
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
          )}
          {mode === "cadastrado" && duplicate && (
            <p className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <AlertCircle size={18} />
              Este veículo já está na fila ou aguarda retirada.
            </p>
          )}
          <div>
            <Label className="mb-3">Serviços</Label>
            {!data.servicos.some((service) => service.ativo) && (
              <p role="status" className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                Nenhum serviço ativo. O administrador deve configurar o catálogo para abrir comandas.
              </p>
            )}
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
              <Label>Funcionário responsável</Label>
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
                        .filter((f) => f.ativo && f.cargo !== "ADMIN")
                        .map((f) => ({ value: f.id, label: f.nome })),
                    ]}
                    placeholder="Selecione o funcionário"
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
          {quickError && mode === "rapido" && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {quickError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              disabled={
                busy || quickBusy || (mode === "cadastrado" && duplicate)
              }
              type="submit"
            >
              {busy || quickBusy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              {mode === "rapido" ? "Iniciar lavagem" : "Abrir comanda"}
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
    [contactName, setContactName] = useState(""),
    [contactPhone, setContactPhone] = useState(""),
    [cancel, setCancel] = useState(false);
  const o = data?.comandas.find((o) => o.id === id);
  useEffect(() => {
    setPayment(o?.formaPagamento ?? "");
    setWasher(o?.funcionarioId ?? "");
  }, [id, o?.formaPagamento, o?.funcionarioId]);
  useEffect(() => {
    setContactName(o?.nomeCliente ?? "");
    setContactPhone(o?.telefoneCliente ?? "");
  }, [id, o?.nomeCliente, o?.telefoneCliente]);
  const c = data?.clientes.find((c) => c.id === o?.clienteId),
    v = data?.veiculos.find((v) => v.id === o?.veiculoId),
    whatsapp = normalizeWhatsappPhone(o?.telefoneCliente || c?.telefone),
    pixStored = data?.configuracao.pixChave ?? "",
    pixCode =
      o && pixStored && !pixStored.startsWith("data:image/")
        ? pixPayload({
            chave: pixStored,
            valor: o.total,
            nome: data?.configuracao.nome ?? "Ducha Elitte",
            txid: "CMD" + o.numero,
          })
        : "",
    pixQrSrc = pixStored.startsWith("data:image/")
      ? pixStored
      : pixCode
        ? "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" +
          encodeURIComponent(pixCode)
        : "";
  const transition = async (status: Status) => {
    if (!o) return;
    const payload: Record<string, unknown> = {
      status,
      funcionarioId: washer || null,
      formaPagamento: payment || null,
    };
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
                      {v
                        ? [v.marca, v.modelo].join(" ")
                        : o.tipoVeiculo === "MOTO"
                          ? "Moto"
                          : o.tipoVeiculo === "CAMINHONETE"
                            ? "Caminhonete"
                            : "Carro"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {v
                        ? [v.cor, v.ano].join(" · ")
                        : "Identificado na chegada"}
                    </p>
                  </div>
                </div>
                <span className="plate">
                  {o.placa || v?.placa || "Sem placa"}
                </span>
                <p className="mt-4 border-t border-border pt-3 text-sm">
                  {o.nomeCliente || c?.nome || "Atendimento"}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {o.telefoneCliente || c?.telefone || "Contato encerrado"}
                  </span>
                </p>
              </div>
              {["AGUARDANDO", "EM_LAVAGEM", "FINALIZADO"].includes(o.status) && (
                <details className="rounded-xl border border-border bg-card p-4">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Adicionar dados depois (opcional)
                  </summary>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Não é necessário cadastrar cliente ou veículo para atender.
                    Preencha o contato apenas se desejar avisar pelo WhatsApp.
                    O cliente passa ao histórico somente depois da entrega.
                  </p>
                  <div className="mt-4 space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="order-contact-name">Nome</Label>
                      <Input id="order-contact-name" value={contactName}
                        onChange={(event) => setContactName(event.target.value)}
                        maxLength={120} placeholder="Opcional" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="order-contact-phone">WhatsApp com DDD</Label>
                      <Input id="order-contact-phone" value={contactPhone}
                        onChange={(event) => setContactPhone(event.target.value)}
                        maxLength={20} inputMode="tel" placeholder="Opcional" />
                    </div>
                    <Button type="button" variant="outline" disabled={busy}
                      onClick={() => void mutate({
                        entity: "comandas", method: "PATCH", id: o.id,
                        data: { action: "contato", nomeCliente: contactName, telefoneCliente: contactPhone },
                      })}>
                      Salvar contato
                    </Button>
                  </div>
                </details>
              )}
              {o.status === "FINALIZADO" && whatsapp && (
                <a
                  className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-semibold hover:bg-muted"
                  href={
                    "https://wa.me/" +
                    whatsapp +
                    "?text=" +
                    encodeURIComponent(
                      "Olá, " +
                        (o.nomeCliente || c?.nome || "") +
                        "! Sua lavagem está pronta. Você já pode retirar seu veículo.",
                    )
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Avisar pelo WhatsApp: lavagem pronta</span>
                  <ArrowRight size={15} />
                </a>
              )}
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
              <VehicleInspection
                value={o.vistoria}
                busy={busy}
                readOnly={!["AGUARDANDO", "EM_LAVAGEM"].includes(o.status)}
                onSave={(vistoria) =>
                  mutate({
                    entity: "comandas",
                    method: "PATCH",
                    id: o.id,
                    data: { action: "vistoria", vistoria },
                  })
                }
              />
              {["AGUARDANDO", "EM_LAVAGEM"].includes(o.status) && (
                <div className="space-y-2">
                  <Label>Funcionário responsável</Label>
                  <Choice
                    value={washer}
                    onChange={setWasher}
                    options={data.funcionarios
                      .filter((f) => f.ativo && f.cargo !== "ADMIN")
                      .map((f) => ({ value: f.id, label: f.nome }))}
                    placeholder="Atribua um funcionário"
                  />
                </div>
              )}
              {o.status === "EM_LAVAGEM" && (
                <div className="space-y-3">
                  <Label>Forma de pagamento</Label>
                  <Choice
                    value={payment}
                    onChange={setPayment}
                    options={[
                      ...(pixQrSrc ? [{ value: "PIX", label: "PIX" }] : []),
                      { value: "CREDITO", label: "Cartão" },
                    ]}
                    placeholder="Selecione o pagamento"
                  />
                  {payment === "PIX" && (
                    <div className="rounded-xl border border-primary/35 bg-primary/5 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <QrCode size={18} className="text-primary" />
                        <p className="text-sm font-semibold">
                          Pagamento via PIX
                        </p>
                      </div>
                      {pixQrSrc ? (
                        <div className="space-y-3">
                          <div className="flex justify-center rounded-xl bg-white p-3">
                            <img
                              src={pixQrSrc}
                              alt="QR Code PIX da comanda"
                              width={220}
                              height={220}
                              className="object-contain"
                            />
                          </div>
                          <p className="text-center text-xs text-muted-foreground">
                            Confirme o recebimento no banco e finalize a comanda
                            para registrar como pago via PIX.
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Envie o QR Code PIX em Configurações para liberar este
                          pagamento.
                        </p>
                      )}
                    </div>
                  )}
                  {payment === "CREDITO" && (
                    <div className="flex items-start gap-2 rounded-xl border border-border bg-muted p-3 text-xs text-muted-foreground">
                      <CreditCard
                        size={17}
                        className="mt-0.5 shrink-0 text-primary"
                      />
                      Cartão é registrado manualmente no sistema após a
                      aprovação na maquininha.
                    </div>
                  )}
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
                    {o.pagoEm
                      ? "Pago em " + dateLabel(o.pagoEm)
                      : "Finalizado em " + dateLabel(o.finalizadoEm)}
                    {" · "}Comissão {money(o.comissao)}
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
                {o.status === "EM_LAVAGEM" && (
                  <Button
                    disabled={
                      busy || !payment || (payment === "PIX" && !pixQrSrc)
                    }
                    onClick={() => void transition("FINALIZADO")}
                  >
                    Confirmar pagamento e finalizar
                    <Check size={15} />
                  </Button>
                )}
                {o.status === "FINALIZADO" && (
                  <Button
                    disabled={busy}
                    onClick={() => void transition("ENTREGUE")}
                  >
                    Confirmar entrega
                    <Check size={15} />
                  </Button>
                )}
                {["AGUARDANDO", "EM_LAVAGEM"].includes(o.status) && (
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
