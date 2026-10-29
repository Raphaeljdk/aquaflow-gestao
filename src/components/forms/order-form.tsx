"use client";
import { useState, useEffect, useRef } from "react";
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
  ChevronDown,
  FileDown,
  Share2,
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
import { whatsappLink } from "@/lib/whatsapp";
import { gerarPdfVistoria, baixarPdfVistoria } from "@/lib/inspection-report";
import { toast } from "sonner";
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
  onCreated,
  onClose,
}: {
  open: boolean;
  initialClientId?: string;
  onCreated?: (id: string) => void;
  onClose: () => void;
}) {
  const { data, user, busy, mutate, refresh } = useStore();
  const [mode, setMode] = useState<"rapido" | "cadastrado">("rapido");
  const [quick, setQuick] = useState({ nomeCliente: "", placa: "", tipo: "CARRO" });
  const [quickBusy, setQuickBusy] = useState(false);
  const [quickError, setQuickError] = useState("");
  const initializedFor = useRef<string | null>(null);
  const quickSubmitLock = useRef(false);
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
    setMode(initialClientId ? "cadastrado" : "rapido");
    setQuick({ nomeCliente: "", placa: "", tipo: "CARRO" });
    setQuickError("");
  }, [open, initialClientId]);
  useEffect(() => {
    if (!open) {
      initializedFor.current = null;
      return;
    }
    if (!data) return;
    // A atualização periódica do snapshot não pode apagar os serviços já
    // selecionados ou o desconto enquanto o funcionário preenche a comanda.
    const session = initialClientId ?? "__novo_atendimento__";
    if (initializedFor.current === session) return;
    initializedFor.current = session;
    const firstVehicle =
      data.veiculos.find((vehicle) => vehicle.clienteId === initialClientId)?.id ?? "";
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
    activeServices = data.servicos.filter((s) => s.ativo),
    selected = activeServices.filter((s) => v.servicoIds.includes(s.id)),
    subtotal = selected.reduce((n, s) => n + s.preco, 0),
    duplicate = data.comandas.some(
      (o) => o.veiculoId === v.veiculoId && activeStatus.includes(o.status),
    );
  const submit = form.handleSubmit(async (values) => {
    if (await mutate({ entity: "comandas", method: "POST", data: values }))
      onClose();
  });
  async function submitQuick() {
    if (quickSubmitLock.current) return;
    setQuickError("");
    const values = form.getValues();
    if (!activeServices.length) {
      setQuickError("Nenhum serviço ativo. Peça ao administrador para cadastrar os serviços e valores.");
      return;
    }
    if (!values.servicoIds.length || values.servicoIds.some((id) => !activeServices.some((s) => s.id === id))) {
      setQuickError("Selecione pelo menos um serviço disponível antes de criar a comanda.");
      return;
    }
    quickSubmitLock.current = true;
    setQuickBusy(true);
    try {
      const response = await fetch("/api/atendimentos-rapidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeCliente: quick.nomeCliente,
          placa: quick.placa,
          tipo: quick.tipo,
          servicoIds: values.servicoIds,
          funcionarioId: values.funcionarioId,
          desconto: values.desconto,
          observacoes: values.observacoes,
        }),
      });
      const body = await response.json() as { error?: string; comanda?: { id: string } };
      if (!response.ok) {
        setQuickError(body.error ?? "Não foi possível iniciar o atendimento.");
        return;
      }
      await refresh();
      toast.success("Comanda criada. Faça a vistoria antes de iniciar a lavagem.");
      onClose();
      if (body.comanda?.id) onCreated?.(body.comanda.id);
    } catch {
      setQuickError("Falha de conexão. Confira se a comanda foi criada antes de tentar novamente.");
    } finally {
      quickSubmitLock.current = false;
      setQuickBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col overflow-hidden p-0 sm:max-h-[92dvh] sm:max-w-[640px]">
        <DialogHeader className="shrink-0 border-b border-border p-4 sm:p-6">
          <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
            <CarFront size={22} />
          </div>
          <DialogTitle className="text-xl">Nova comanda</DialogTitle>
          <DialogDescription>
            Receba o veículo e organize o próximo atendimento.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={mode === "rapido" ? (event) => { event.preventDefault(); void submitQuick(); } : submit}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 [-webkit-overflow-scrolling:touch] sm:p-6"
        >
          {!initialClientId && (
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1" role="group" aria-label="Identificação do cliente">
              <button type="button" onClick={() => setMode("rapido")}
                aria-pressed={mode === "rapido"}
                className={mode === "rapido" ? "rounded-lg bg-card px-3 py-2.5 text-sm font-bold shadow-sm" : "rounded-lg px-3 py-2.5 text-sm text-muted-foreground"}>
                Cliente novo
              </button>
              <button type="button" onClick={() => setMode("cadastrado")}
                aria-pressed={mode === "cadastrado"}
                className={mode === "cadastrado" ? "rounded-lg bg-card px-3 py-2.5 text-sm font-bold shadow-sm" : "rounded-lg px-3 py-2.5 text-sm text-muted-foreground"}>
                Buscar cliente anterior
              </button>
            </div>
          )}
          {mode === "rapido" ? (
            <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-bold">Dados para iniciar a lavagem</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Preencha só o necessário. Ao abrir a comanda, o cliente e o veículo entram automaticamente no histórico para os próximos atendimentos.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-client-name">Nome do cliente</Label>
                <Input id="quick-client-name" required minLength={2} maxLength={120}
                  placeholder="Nome do cliente"
                  value={quick.nomeCliente}
                  onChange={(event) => setQuick({ ...quick, nomeCliente: event.target.value })}
                  className="h-11 text-base sm:text-sm" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quick-vehicle-type">Tipo de veículo</Label>
                  <select id="quick-vehicle-type" value={quick.tipo}
                    onChange={(event) => setQuick({ ...quick, tipo: event.target.value })}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base sm:text-sm">
                    <option value="CARRO">Carro</option>
                    <option value="MOTO">Moto</option>
                    <option value="CAMINHONETE">Caminhonete</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick-license-plate">Placa</Label>
                  <Input id="quick-license-plate" required minLength={7} maxLength={8}
                    placeholder="ABC1D23"
                    value={quick.placa}
                    onChange={(event) => setQuick({ ...quick, placa: event.target.value.toUpperCase() })}
                    className="h-11 uppercase text-base sm:text-sm" />
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
              {!initialClientId && <button type="button" className="mt-2 text-left text-sm font-semibold text-primary underline underline-offset-4" onClick={() => { setMode("rapido"); form.setValue("clienteId", ""); form.setValue("veiculoId", ""); }}>Não encontrou? Atender como cliente novo</button>}
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
          <div className="space-y-2">
            <Label>Serviços</Label>
            <details className="group rounded-lg border border-input bg-background">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <span className={selected.length ? "min-w-0 font-medium text-foreground" : "min-w-0 text-muted-foreground"}>
                  {selected.length
                    ? selected.length === 1
                      ? selected[0].nome + " · " + money(selected[0].preco)
                      : selected.length + " serviços selecionados · " + money(subtotal)
                    : "Selecione os serviços"}
                </span>
                <ChevronDown size={16} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="max-h-64 space-y-1 overflow-y-auto border-t border-border p-2" role="group" aria-label="Lista de serviços disponíveis">
                {activeServices.map((service) => {
                  const checked = v.servicoIds.includes(service.id);
                  return (
                    <label key={service.id} className={"flex cursor-pointer items-center gap-3 rounded-md px-3 py-3 transition-colors " + (checked ? "bg-primary/10" : "hover:bg-muted")}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          form.setValue("servicoIds", value
                            ? [...v.servicoIds, service.id]
                            : v.servicoIds.filter((id) => id !== service.id),
                            { shouldValidate: true, shouldDirty: true },
                          )
                        }
                        aria-label={service.nome}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{service.nome}</span>
                        <span className="text-xs text-muted-foreground">{service.duracaoMin} min</span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">{money(service.preco)}</span>
                    </label>
                  );
                })}
              </div>
            </details>
            {selected.length > 0 && <p className="text-xs text-muted-foreground">{selected.length} selecionado(s) · {selected.reduce((sum, service) => sum + service.duracaoMin, 0)} minutos estimados</p>}
            {!activeServices.length && (
              <div role="alert" className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <p className="font-semibold">Ainda não há serviços disponíveis.</p>
                <p className="mt-1 text-muted-foreground">
                  {user?.role === "ADMIN"
                    ? "Cadastre os serviços e os respectivos preços para liberar novas comandas."
                    : "Peça ao administrador do lava-rápido para cadastrar os serviços e preços."}
                </p>
                {user?.role === "ADMIN" && (
                  <a href="/servicos" className="mt-2 inline-block font-semibold text-primary underline underline-offset-4">
                    Configurar serviços
                  </a>
                )}
              </div>
            )}
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
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{quickError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={busy || quickBusy || !activeServices.length || (mode === "cadastrado" && duplicate)} type="submit">
              {busy || quickBusy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              {mode === "rapido" ? "Abrir comanda e colocar na fila" : "Abrir comanda"}
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
    v = data?.veiculos.find((v) => v.id === o?.veiculoId),
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
  async function documentoVistoria() {
    if (!o || !o.vistoria || !o.vistoria.itens.length || o.vistoria.itens.some(i => !i.revisado)) {
      toast.error("Conclua e salve todos os itens da vistoria antes de compartilhar.");
      return null;
    }
    return gerarPdfVistoria({
      numero: o.numero,
      estabelecimento: data?.configuracao.nome ?? "Ducha Elitte",
      cliente: c?.nome ?? "Não informado",
      telefone: c?.telefone ?? "Não informado",
      veiculo: [v?.marca, v?.modelo, v?.cor].filter(Boolean).join(" "),
      placa: v?.placa ?? "Não informada",
      criadoEm: o.createdAt,
      vistoria: o.vistoria,
    });
  }
  async function baixarVistoria() {
    try {
      const arquivo = await documentoVistoria();
      if (arquivo) { baixarPdfVistoria(arquivo); toast.success("PDF da vistoria baixado."); }
    } catch { toast.error("Não foi possível gerar a vistoria em PDF."); }
  }
  async function compartilharVistoria() {
    try {
      const arquivo = await documentoVistoria();
      if (!arquivo) return;
      const texto = "Olá, " + (c?.nome ?? "cliente") + "! Segue a vistoria de entrada do veículo " +
        (v?.placa ?? "") + " (comanda #" + o?.numero + "). Confira os registros de avarias.";
      if (navigator.canShare?.({ files: [arquivo] }) && navigator.share) {
        try {
          await navigator.share({ files: [arquivo], title: "Vistoria de entrada", text: texto });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }
      // WhatsApp Web não permite anexos via link: baixar PDF para o atendente anexar.
      baixarPdfVistoria(arquivo);
      const link = whatsappLink(c?.telefone, texto);
      if (link) window.open(link, "_blank", "noopener,noreferrer");
      toast.info(link
        ? "PDF baixado. Anexe-o na conversa do WhatsApp antes de enviar."
        : "PDF baixado. Informe um WhatsApp válido para abrir a conversa do cliente.");
    } catch { toast.error("Não foi possível preparar o compartilhamento da vistoria."); }
  }
  return (
    <>
      <Sheet open={!!id} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-screen max-w-full gap-0 overflow-y-auto overscroll-contain sm:w-[min(94vw,880px)] sm:max-w-[880px]">
          <SheetHeader className="border-b border-border p-6">
            <SheetTitle className="text-xl">Comanda #{o?.numero}</SheetTitle>
            <SheetDescription>
              {o
                ? dateLabel(o.createdAt, "dd 'de' MMMM 'às' HH:mm")
                : "Detalhes do atendimento"}
            </SheetDescription>
          </SheetHeader>
          {o && data && (
            <div className="min-w-0 space-y-6 p-4 sm:p-6">
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
              <VehicleInspection
                key={o.id}
                tipo={v?.tipo ?? "CARRO"}
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
                        <p className="text-sm font-semibold">Pagamento via PIX</p>
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
                            Confirme o recebimento no banco e finalize a comanda para registrar como pago via PIX.
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Envie o QR Code PIX em Configurações para liberar este pagamento.
                        </p>
                      )}
                    </div>
                  )}
                  {payment === "CREDITO" && (
                    <div className="flex items-start gap-2 rounded-xl border border-border bg-muted p-3 text-xs text-muted-foreground">
                      <CreditCard size={17} className="mt-0.5 shrink-0 text-primary" />
                      Cartão é registrado manualmente no sistema após a aprovação na maquininha.
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
                    {o.pagoEm ? "Pago em " + dateLabel(o.pagoEm) : "Finalizado em " + dateLabel(o.finalizadoEm)}
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
                    disabled={busy || !payment || (payment === "PIX" && !pixQrSrc)}
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
                <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-muted/30 p-3">
                 <div className="min-w-full">
                   <p className="text-sm font-semibold">Entregar vistoria ao cliente</p>
                   <p className="mt-1 text-xs text-muted-foreground">Conclua e salve o checklist antes de gerar o PDF. No celular, escolha o WhatsApp para enviar o arquivo; no computador, anexe o PDF baixado.</p>
                 </div>
                 <Button type="button" variant="outline" size="sm" onClick={() => void baixarVistoria()}>
                   <FileDown size={16}/> Baixar PDF
                 </Button>
                 <Button type="button" variant="outline" size="sm" onClick={() => void compartilharVistoria()}>
                   <Share2 size={16}/> Compartilhar pelo WhatsApp
                 </Button>
               </div>
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
