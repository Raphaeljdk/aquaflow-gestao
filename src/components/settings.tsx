"use client";
import { useForm, Controller } from "react-hook-form";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Save,
  Building2,
  Clock3,
  Upload,
  Loader2,
  ExternalLink,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/hooks/use-store";
import { PageTitle, Choice, Empty } from "./common";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { configuracaoSchema } from "@/lib/validations";
import { ErrorText } from "./forms/order-form";
import type { Configuracao } from "@/types";
import { canManage } from "@/lib/permissions";
import { normalizeWhatsappPhone } from "@/lib/whatsapp";
import { cnpjValido } from "@/lib/cnpj-publico";
export function Settings() {
  const { data, user } = useStore();
  if (!data || !user) return null;
  if (!canManage(user.role))
    return (
      <Empty
        title="Acesso restrito"
        text="Somente o administrador pode alterar as configurações."
      />
    );
  return <SettingsForm initial={data.configuracao} />;
}
function SettingsForm({ initial }: { initial: Configuracao }) {
  const [consultandoCnpj, setConsultandoCnpj] = useState(false);
  const [activeTab, setActiveTab] = useState("empresa");
  const [errorNotice, setErrorNotice] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const { mutate, busy } = useStore(),
    f = useForm<Configuracao>({
      resolver: zodResolver(configuracaoSchema),
      defaultValues: initial,
      mode: "onBlur",
    }),
    values = f.watch();
  const { reset } = f;
  // Atualizações de outros dispositivos: sincronizar apenas sem alterações locais,
  // para o refresh periódico não apagar um formulário ainda não salvo.
  useEffect(() => {
    if (!f.formState.isDirty && !f.formState.isSubmitting) reset(initial);
  }, [initial, reset, f.formState.isDirty, f.formState.isSubmitting]);
  const misplacedPhone = Boolean(
    values.cnpj && !cnpjValido(values.cnpj) &&
    normalizeWhatsappPhone(values.cnpj) &&
    !normalizeWhatsappPhone(values.telefone),
  );
  const input = (name: keyof Configuracao, label: string, type = "text") => (
    <div className="space-y-2">
      <Label htmlFor={"setting-" + name}>{label}</Label>
      <Input
        id={"setting-" + name}
        type={type}
        inputMode={name === "cnpj" ? "numeric" : undefined}
        autoComplete={name === "telefone" ? "tel" : "off"}
        aria-invalid={Boolean(f.formState.errors[name])}
        {...f.register(name)}
      />
      <ErrorText message={f.formState.errors[name]?.message} />
    </div>
  );
  async function uploadImage(
    field: "logo" | "pixChave",
    file?: File,
  ) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 300000
    ) {
      toast.error("Escolha uma imagem PNG, JPG ou WebP de até 300 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      f.setValue(field, String(reader.result), { shouldDirty: true, shouldValidate: true });
    reader.readAsDataURL(file);
  }
  const whatsappReady = Boolean(normalizeWhatsappPhone(values.telefone));
  const bookingUrl = "/agendar/empresa";
  const bookingReady = Boolean(normalizeWhatsappPhone(initial.telefone)) && !f.formState.isDirty;
  async function buscarCnpj() {
    setConsultandoCnpj(true);
    try {
      const numero = f.getValues("cnpj").replace(/\D/g, "");
      const res = await fetch("/api/public/cnpj/" + encodeURIComponent(numero), { cache: "no-store" });
      const data = await res.json() as { error?: string; razaoSocial?: string; nomeFantasia?: string; endereco?: string; situacao?: string };
      if (!res.ok) throw new Error(data.error || "Consulta indisponível.");
      if (data.nomeFantasia || data.razaoSocial) f.setValue("nome", (data.nomeFantasia || data.razaoSocial)!, { shouldDirty: true });
      if (data.endereco) f.setValue("endereco", data.endereco, { shouldDirty: true });
      toast.success("Dados públicos carregados. Confira e salve as alterações.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao consultar. Preencha manualmente.");
    } finally { setConsultandoCnpj(false); }
  }
  async function submitSettings(v: Configuracao) {
    setErrorNotice("");
    const success = await mutate({
      entity: "configuracoes",
      method: "PATCH",
      data: { ...v },
    });
    if (success) {
      f.reset(v);
      setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      toast.success("Configurações confirmadas no banco. Os novos dados já estão disponíveis.");
    } else {
      setErrorNotice("Não foi possível salvar as configurações. Confira o aviso e tente novamente.");
    }
  }
  function invalidSettings(errors: typeof f.formState.errors) {
    const keys = Object.keys(errors);
    const first = keys[0] as keyof Configuracao | undefined;
    const hours = ["abertura", "fechamento", "intervaloMin", "diasSemana", "timezone"];
    const help = ["manualVideoUrl", "manualPdfUrl"];
    const tab = first && hours.includes(first) ? "horarios" : first && help.includes(first) ? "ajuda" : "empresa";
    setActiveTab(tab);
    const firstError = first && errors[first]?.message;
    const message = typeof firstError === "string" ? firstError : "Confira os campos em destaque.";
    setErrorNotice("Alterações não salvas: " + message);
    toast.error("Não foi possível salvar: " + message);
    if (first) window.setTimeout(() => document.getElementById("setting-" + first)?.focus(), 100);
  }
  function moverTelefone() {
    if (!misplacedPhone) return;
    f.setValue("telefone", values.cnpj, { shouldDirty: true, shouldValidate: true });
    f.setValue("cnpj", "", { shouldDirty: true, shouldValidate: true });
    setErrorNotice("");
    toast.info("Número movido para WhatsApp. Clique em Salvar alterações para confirmar.");
  }
  return (
    <form onSubmit={f.handleSubmit(submitSettings, invalidSettings)}>
      <PageTitle
        title="Configurações"
        description="Deixe o sistema com o jeito do seu lava rápido."
      >
        <Button type="submit" disabled={busy}>
          {busy ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          Salvar alterações
        </Button>
      </PageTitle>
      {errorNotice && (
        <div role="alert" className="mb-4 max-w-3xl rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorNotice}
        </div>
      )}
      {f.formState.isDirty && (
        <div role="status" className="mb-4 max-w-3xl rounded-xl border border-amber-500/30 px-4 py-3 text-sm">
          Você tem alterações não salvas. Use o botão <strong>Salvar alterações</strong> no topo ou no final desta página.
        </div>
      )}
      <section className="panel mb-6 max-w-3xl space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Primeiros passos</p>
            <h2 className="mt-1 text-xl font-bold">Personalize seu lava-rápido</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cada proprietário pode configurar estes dados diretamente, sem solicitar alterações ao desenvolvedor.
            </p>
          </div>
          <span className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold">
            {whatsappReady ? "WhatsApp configurado" : "Configure o WhatsApp"}
          </span>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <span className="flex items-center gap-2"><CheckCircle2 className="shrink-0 text-primary" size={17}/> Nome e identidade do estabelecimento</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="shrink-0 text-primary" size={17}/> Telefone de agendamentos</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="shrink-0 text-primary" size={17}/> Horários de funcionamento</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="shrink-0 text-primary" size={17}/> Configuração PIX (opcional)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" size="sm" disabled={!bookingReady}
            onClick={() => {
              void navigator.clipboard.writeText(window.location.origin + bookingUrl)
                .then(() => toast.success("Link de agendamento copiado."))
                .catch(() => toast.error("Não foi possível copiar o link."));
            }}>
            <Copy size={15}/> Copiar link para clientes
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15}/> Ver página de agendamento
            </a>
          </Button>
          {!bookingReady && <p className="w-full text-xs text-muted-foreground">Cadastre um WhatsApp válido e salve as alterações antes de compartilhar o link.</p>}
        </div>
      </section>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="empresa" className="gap-2">
            <Building2 size={15} />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="horarios" className="gap-2">
            <Clock3 size={15} />
            Funcionamento
          </TabsTrigger>
          <TabsTrigger value="ajuda" className="gap-2">
            <Building2 size={15} />
            Como usar
          </TabsTrigger>
        </TabsList>
        <TabsContent value="empresa">
          <section className="panel max-w-3xl p-4 sm:p-6">
            <h2 className="mb-1 text-lg font-semibold">Dados da empresa</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Informações usadas no sistema e nos relatórios.
            </p>
            <div className="mb-7 flex flex-wrap items-center gap-5">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-accent">
                {values.logo || values.nome?.toLowerCase().startsWith("ducha elitte") ? (
                  <img
                    src={values.logo || "/ducha-elitte-logo.jpg"}
                    alt="Logo da empresa"
                    className="size-full object-contain bg-white p-1"
                  />
                ) : <Building2 size={30} className="text-muted-foreground" />}
              </div>
              <div>
                <Label
                  htmlFor="logo-upload"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm hover:bg-muted"
                >
                  <Upload size={15} />
                  Enviar logo
                </Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) =>
                    void uploadImage("logo", e.target.files?.[0])
                  }
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  PNG, JPG ou WebP. Máximo 300 KB.
                </p>
                {values.logo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 px-0"
                    onClick={() =>
                      f.setValue("logo", "", { shouldDirty: true })
                    }
                  >
                    Usar logo padrão
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-5">
              {input("nome", "Nome da empresa")}
              <div className="grid gap-5 sm:grid-cols-2">
                {input("cnpj", "CNPJ (opcional)")}
                {misplacedPhone && (
                  <div role="alert" className="sm:col-span-2 rounded-lg border border-amber-500/40 p-3 text-sm">
                    <p>Este valor parece ser um telefone, não um CNPJ. O WhatsApp está vazio.</p>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={moverTelefone}>
                      Mover número para WhatsApp
                    </Button>
                  </div>
                )}
                <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                  <Button type="button" variant="outline" disabled={consultandoCnpj || !cnpjValido(values.cnpj ?? "")}
                    onClick={() => void buscarCnpj()}>
                    {consultandoCnpj ? <Loader2 size={15} className="animate-spin" /> : <Building2 size={15} />}
                    Consultar CNPJ e preencher dados
                  </Button>
                  <p className="text-xs text-muted-foreground">Preenche o nome e endereço com dados públicos. Revise antes de salvar.</p>
                </div>
                {input("telefone", "WhatsApp de agendamentos (com DDD)", "tel")}
              </div>
              <p className="-mt-3 text-xs text-muted-foreground">Ex.: +55 11 99200-3650. O número será usado na página pública de agendamentos por WhatsApp.</p>
              {input("endereco", "Endereço")}
              <div className="border-t border-border pt-5">
                <Label>QR Code PIX</Label>
                <div className="mt-3 flex flex-wrap items-center gap-5">
                  <div className="flex size-40 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white p-2">
                    {values.pixChave?.startsWith("data:image/") ? (
                      <img
                        src={values.pixChave}
                        alt="QR Code PIX"
                        className="size-full object-contain"
                      />
                    ) : (
                      <span className="px-4 text-center text-xs text-muted-foreground">
                        Nenhum QR Code enviado
                      </span>
                    )}
                  </div>
                  <div>
                    <Label
                      htmlFor="pix-qr-upload"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm hover:bg-muted"
                    >
                      <Upload size={15} />
                      Enviar QR Code PIX
                    </Label>
                    <Input
                      id="pix-qr-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) =>
                        void uploadImage("pixChave", e.target.files?.[0])
                      }
                    />
                    <p className="mt-2 max-w-sm text-xs text-muted-foreground">
                      Envie o QR Code PIX oficial em PNG, JPG ou WebP (até 300 KB). Depois clique em “Salvar alterações” no topo. Teste a leitura com seu banco antes de receber pagamentos. Um QR fixo não confirma o pagamento automaticamente.
                    </p>
                    {values.pixChave && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-1 px-0 text-destructive"
                        onClick={() =>
                          f.setValue("pixChave", "", { shouldDirty: true })
                        }
                      >
                        Remover QR Code
                      </Button>
                    )}
                  </div>
                </div>
                <ErrorText message={f.formState.errors.pixChave?.message} />
              </div>
            </div>
          </section>
        </TabsContent>
        <TabsContent value="horarios">
          <section className="panel max-w-3xl p-6">
            <h2 className="text-lg font-semibold">Horário de funcionamento</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A agenda usa o fuso de São Paulo (America/Sao_Paulo).
            </p>
            <div className="my-6 grid gap-5 sm:grid-cols-3">
              {input("abertura", "Abertura", "time")}
              {input("fechamento", "Fechamento", "time")}
              <div className="space-y-2">
                <Label>Intervalo de horários</Label>
                <Controller
                  name="intervaloMin"
                  control={f.control}
                  render={({ field }) => (
                    <Choice
                      value={String(field.value)}
                      onChange={(v) => field.onChange(Number(v))}
                      options={[15, 30, 60].map((n) => ({
                        value: String(n),
                        label: n + " minutos",
                      }))}
                    />
                  )}
                />
              </div>
            </div>
            <Label className="mb-4">Dias de atendimento</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                "Domingo",
                "Segunda",
                "Terça",
                "Quarta",
                "Quinta",
                "Sexta",
                "Sábado",
              ].map((day, i) => (
                <label
                  key={day}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <Checkbox
                    checked={values.diasSemana.includes(i)}
                    onCheckedChange={(v) =>
                      f.setValue(
                        "diasSemana",
                        v
                          ? [...values.diasSemana, i]
                          : values.diasSemana.filter((n) => n !== i),
                        { shouldValidate: true },
                      )
                    }
                  />
                  {day}
                </label>
              ))}
            </div>
            <ErrorText message={f.formState.errors.diasSemana?.message} />
            <p className="mt-6 rounded-lg bg-accent p-4 text-sm text-accent-foreground">
              Cada reserva ocupa o tempo total dos serviços. Horários
              sobrepostos são bloqueados automaticamente.
            </p>
          </section>
        </TabsContent>
        <TabsContent value="ajuda">
          <section className="panel max-w-3xl space-y-5 p-4 sm:p-6">
            <h2 className="text-lg font-semibold">Vídeo e manual de uso</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Cole o link HTTPS de um vídeo de treinamento. O Ducha Elitte já possui um manual em PDF integrado. Você pode informar o endereço de outro PDF, caso queira substituir o manual padrão.
              Os links aparecerão na aba “Como usar” do painel para os funcionários.
            </p>
            {input("manualVideoUrl", "Link do vídeo (YouTube ou outro HTTPS)", "url")}
            {input("manualPdfUrl", "Link de um PDF personalizado (opcional)", "url")}
            <a href="/api/manual" target="_blank" rel="noopener noreferrer" className="inline-flex text-sm font-semibold text-primary underline underline-offset-4">Abrir o manual PDF padrão</a>
            <p className="text-xs text-muted-foreground">Deixe o vídeo vazio enquanto não houver treinamento publicado. O manual PDF padrão permanece disponível para toda a equipe.</p>
          </section>
        </TabsContent>
      </Tabs>
      <div className="mt-5 max-w-3xl rounded-xl border border-border p-4 text-sm text-muted-foreground">
        Os serviços e preços são gerenciados em Gestão → Serviços pelo administrador. O funcionário trabalha somente em Clientes, Comandas e Agendamentos.
      </div>
      <div className="sticky bottom-2 z-20 mt-5 max-w-3xl rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="status" className="text-xs text-muted-foreground">
            {busy || f.formState.isSubmitting
              ? "Gravando configurações..."
              : f.formState.isDirty
                ? "Alterações pendentes de salvamento"
                : savedAt
                  ? "Tudo salvo às " + savedAt
                  : "Edite os dados e salve para aplicar"}
          </div>
          <Button type="submit" disabled={busy || f.formState.isSubmitting}>
            {busy || f.formState.isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar alterações
          </Button>
        </div>
      </div>
    </form>
  );
}
