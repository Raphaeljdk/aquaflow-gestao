"use client";
import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CarFront,
  Pencil,
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
import { paymentLabels, type Status, type Veiculo } from "@/types";
import { VehicleInspection } from "@/components/vehicle-inspection";
import { OrderProducts } from "@/components/order-products";
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
  const { data, user, mutate, busy, refresh } = useStore(),
    [payment, setPayment] = useState(""),
    [pixConfirmado, setPixConfirmado] = useState(false),
    [washer, setWasher] = useState(""),
    [cancel, setCancel] = useState(false),
    [editingVehicle, setEditingVehicle] = useState(false),
    [vehicleType, setVehicleType] = useState<Veiculo["tipo"]>("CARRO"),
    [whatsappConsentChecked,setWhatsappConsentChecked] = useState(false),
    [whatsappBusy,setWhatsappBusy] = useState(false);
  const o = data?.comandas.find((o) => o.id === id);
  useEffect(() => {
    setPayment(o?.formaPagamento ?? "");
    setPixConfirmado(false);
    setWhatsappConsentChecked(false);
    setWasher(o?.funcionarioId ?? "");
  }, [id, o?.formaPagamento, o?.funcionarioId]);
  const c = data?.clientes.find((c) => c.id === o?.clienteId),
    v = data?.veiculos.find((v) => v.id === o?.veiculoId),
    pixStored = data?.configuracao.pixRecebimentoAtivo ? (data?.configuracao.pixRecebimentoChave ?? "") : "",
    pixCode =
      o && pixStored && !pixStored.startsWith("data:image/")
        ? pixPayload({
            chave: pixStored,
            valor: o.total,
            nome: data?.configuracao.nome ?? "ESTABELECIMENTO",
            txid: "CMD" + o.numero,
          })
        : "",
    pixQrSrc = pixStored.startsWith("data:image/")
      ? pixStored
      : pixCode
        ? "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" +
          encodeURIComponent(pixCode)
        : "";
  useEffect(() => {
    setEditingVehicle(false);
    setVehicleType(v?.tipo ?? "CARRO");
  }, [id, v?.tipo]);

  async function corrigirTipoVeiculo() {
    if (!o || !v || !["AGUARDANDO", "EM_LAVAGEM"].includes(o.status)) return;
    if (vehicleType === v.tipo) {
      setEditingVehicle(false);
      return;
    }
    const saved = await mutate({
      entity: "comandas",
      method: "PATCH",
      id: o.id,
      data: { action: "corrigirTipoVeiculo", tipo: vehicleType },
    });
    if (saved) {
      setEditingVehicle(false);
      toast.success("Tipo de veículo corrigido com sucesso.");
    }
  }

  const transition = async (status: Status) => {
    if (!o) return;
    const payload: Record<string, unknown> = {
      status,
      funcionarioId: washer || null,
      formaPagamento: payment || null,
      ...(status === "FINALIZADO" && payment === "PIX" ? { pixConfirmadoManualmente: pixConfirmado } : {}),
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
      tipo: v?.tipo ?? "CARRO",
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
  async function consentimentoWhatsapp(revogar:boolean){
    if(!o||whatsappBusy)return;
    setWhatsappBusy(true);
    try {
      const response=await fetch("/api/comandas/"+encodeURIComponent(o.id)+"/whatsapp/autorizacao",{
        method:revogar?"DELETE":"POST",headers:{"Content-Type":"application/json"},
        body:revogar?undefined:JSON.stringify({confirmado:true}),
      });
      const data=await response.json() as {error?:string};
      if(!response.ok)throw new Error(data.error??"Não foi possível alterar a autorização.");
      setWhatsappConsentChecked(false);
      await refresh();
      toast.success(revogar?"Autorização revogada e envios futuros cancelados.":"Autorização registrada para este atendimento.");
    }catch(e){toast.error(e instanceof Error?e.message:"Falha ao registrar autorização.");}
    finally{setWhatsappBusy(false);}
  }
  async function arquivoComanda(): Promise<File | null> {
    if (!o) return null;
    const response = await fetch("/api/comandas/" + encodeURIComponent(o.id) + "/pdf", { cache: "no-store" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? "Não foi possível gerar a comanda completa.");
    }
    const blob=await response.blob();
    return new File([blob], "comanda-completa-" + o.numero + ".pdf", {type:"application/pdf"});
  }
  async function baixarComanda() {
    try {
      const pdf = await arquivoComanda();
      if (pdf) {baixarPdfVistoria(pdf);toast.success("PDF completo da comanda baixado.");}
    }catch(e) {toast.error(e instanceof Error ? e.message : "Erro ao gerar comanda.");}
  }
  async function compartilharComanda() {
    try {
      const pdf = await arquivoComanda();
      if(!pdf) return;
      const texto = "Olá, " + (c?.nome ?? "cliente") + "! Segue a comanda #" + o?.numero +
        " do veículo " + (v?.placa ?? "") + ", no valor registrado de " + money(o?.total ?? 0) + ".";
      if(navigator.canShare?.({files:[pdf]}) && navigator.share) {
        try {
          await navigator.share({files:[pdf],title:"Comanda completa",text:texto});
          return;
        }catch(error){if(error instanceof DOMException && error.name==="AbortError") return;}
      }
      baixarPdfVistoria(pdf);
      const url=whatsappLink(c?.telefone,texto);
      if(url) window.open(url,"_blank","noopener,noreferrer");
      toast.info(url?"Anexe o PDF baixado na conversa do WhatsApp antes de enviar.":"PDF salvo. Cadastre um número válido para abrir a conversa.");
    }catch(e){toast.error(e instanceof Error?e.message:"Falha ao compartilhar comanda.");}
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
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Tipo: {v?.tipo === "MOTO" ? "Moto" : v?.tipo === "CAMINHONETE" ? "Caminhonete" : "Carro"}
                  </p>
                  {v && ["AGUARDANDO", "EM_LAVAGEM"].includes(o.status) && !editingVehicle && (
                    <Button type="button" variant="outline" size="sm" disabled={busy}
                      onClick={() => { setVehicleType(v.tipo); setEditingVehicle(true); }}>
                      <Pencil size={14} /> Corrigir tipo
                    </Button>
                  )}
                </div>
                {v && editingVehicle && ["AGUARDANDO", "EM_LAVAGEM"].includes(o.status) && (
                  <div className="mb-3 space-y-3 rounded-lg border border-border bg-background p-3">
                    <Label htmlFor={"tipo-veiculo-comanda-" + o.id}>Tipo correto do veículo</Label>
                    <select id={"tipo-veiculo-comanda-" + o.id} value={vehicleType} disabled={busy}
                      onChange={(event) => setVehicleType(event.target.value as Veiculo["tipo"])}
                      className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                      <option value="CARRO">Carro</option>
                      <option value="MOTO">Moto</option>
                      <option value="CAMINHONETE">Caminhonete</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      A correção atualiza o cadastro deste veículo. Serviços, valores e tempo da comanda não mudam.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" disabled={busy} onClick={() => void corrigirTipoVeiculo()}>
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar alteração
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={busy}
                        onClick={() => setEditingVehicle(false)}>Voltar</Button>
                    </div>
                  </div>
                )}
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
                  <span>Total (serviços + produtos)</span>
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
              <OrderProducts key={"produtos-" + o.id} id={o.id} status={o.status} onChanged={refresh} />
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
                    onChange={(value) => { setPayment(value); setPixConfirmado(false); }}
                    options={[
                      ...(pixQrSrc ? [{ value: "PIX", label: "Pix" }] : []),
                      { value: "DEBITO", label: "Cartão de débito" },
                      { value: "CREDITO", label: "Cartão de crédito" },
                      { value: "DINHEIRO", label: "Dinheiro" },
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
                          {pixCode && (
                            <Button type="button" size="sm" variant="outline" className="w-full"
                              onClick={() => void navigator.clipboard.writeText(pixCode)
                                .then(() => toast.success("Código Pix copia e cola copiado."))
                                .catch(() => toast.error("Não foi possível copiar o código Pix."))}>
                              Copiar Pix copia e cola · {money(o.total)}
                            </Button>
                          )}
                          <p className="text-center text-xs text-muted-foreground">
                            Confirme o recebimento no banco pelo extrato, conferindo o valor antes de registrar como pago. O sistema não verifica recebimento automático.
                          </p>
                          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-background p-3 text-xs">
                            <input type="checkbox" checked={pixConfirmado} onChange={(event) => setPixConfirmado(event.target.checked)} className="mt-0.5 size-4 accent-emerald-600" />
                            <span>Confirmo que verifiquei o recebimento deste Pix no extrato bancário do estabelecimento. Esta confirmação é manual.</span>
                          </label>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          O administrador do lava-rápido precisa configurar e habilitar sua própria chave ou QR Code em Configurações. O Pix da assinatura da plataforma não é utilizado.
                        </p>
                      )}
                    </div>
                  )}
                  {(payment === "CREDITO" || payment === "DEBITO") && (
                    <div className="flex items-start gap-2 rounded-xl border border-border bg-muted p-3 text-xs text-muted-foreground">
                      <CreditCard size={17} className="mt-0.5 shrink-0 text-primary" />
                      Cartão de débito ou crédito é registrado manualmente após a aprovação na maquininha. Não há cobrança automática nesta tela.
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
                    disabled={busy || !payment || (payment === "PIX" && (!pixQrSrc || !pixConfirmado))}
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
                 <Button type="button" variant="outline" size="sm" onClick={() => void baixarComanda()}>
                   <FileDown size={16}/> PDF completo da comanda
                 </Button>
                 <Button type="button" variant="outline" size="sm" onClick={() => void compartilharComanda()}>
                   <Share2 size={16}/> Compartilhar comanda
                 </Button>
                 {o.whatsappEnvioStatus && <p className="w-full text-xs text-muted-foreground">
                   WhatsApp oficial: {o.whatsappEnvioStatus === "SUBMITTED" ? "aceito para envio pela Meta" :
                     o.whatsappEnvioStatus === "DELIVERED" ? "entregue" :
                     o.whatsappEnvioStatus === "READ" ? "lido" :
                     o.whatsappEnvioStatus === "PENDING" ? "aguardando processamento" :
                     o.whatsappEnvioStatus === "UNKNOWN" ? "resultado incerto — revisão manual" :
                     o.whatsappEnvioStatus === "FAILED" ? "falhou — revisão manual" :
                     o.whatsappEnvioStatus === "CANCELED" ? "cancelado" : o.whatsappEnvioStatus}
                 </p>}
               </div>
               {["AGUARDANDO","EM_LAVAGEM"].includes(o.status) &&
                 <div className="rounded-xl border border-border p-3 space-y-3">
                   <p className="text-sm font-semibold">Autorização para envio automático pelo WhatsApp</p>
                   <p className="text-xs text-muted-foreground">
                     O cliente precisa concordar em receber a comanda em PDF da Ducha Elitte, em nome deste lava-rápido. Apenas cadastrar o telefone não concede autorização.
                   </p>
                   {o.whatsappAutorizadoEm ? (
                     <div className="space-y-2">
                       <p className="text-xs text-emerald-600">Autorização registrada em {new Date(o.whatsappAutorizadoEm).toLocaleString("pt-BR")}.</p>
                       <Button variant="outline" size="sm" type="button" disabled={whatsappBusy}
                         onClick={()=>void consentimentoWhatsapp(true)}>Revogar autorização</Button>
                     </div>
                   ) : (
                     <div className="space-y-2">
                       <label className="flex items-start gap-2 text-xs">
                         <input type="checkbox" className="mt-0.5 size-4" checked={whatsappConsentChecked}
                           onChange={e=>setWhatsappConsentChecked(e.target.checked)}/>
                         Confirmo que o cliente foi informado e autorizou o recebimento da comanda pelo WhatsApp.
                       </label>
                       <Button variant="outline" size="sm" type="button" disabled={!whatsappConsentChecked||whatsappBusy}
                         onClick={()=>void consentimentoWhatsapp(false)}>Registrar autorização do cliente</Button>
                     </div>
                   )}
                 </div>}
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
