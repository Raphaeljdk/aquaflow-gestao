"use client";
import { useForm, Controller } from "react-hook-form";
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
  const { mutate, busy } = useStore(),
    f = useForm<Configuracao>({
      resolver: zodResolver(configuracaoSchema),
      defaultValues: initial,
    }),
    values = f.watch();
  const input = (name: keyof Configuracao, label: string, type = "text") => (
    <div className="space-y-2">
      <Label htmlFor={"setting-" + name}>{label}</Label>
      <Input id={"setting-" + name} type={type} {...f.register(name)} />
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
      f.setValue(field, String(reader.result), { shouldDirty: true });
    reader.readAsDataURL(file);
  }
  const whatsappReady = Boolean(normalizeWhatsappPhone(values.telefone));
  const bookingUrl = "/agendar";
  return (
    <form
      onSubmit={f.handleSubmit(async (v) => {
        await mutate({
          entity: "configuracoes",
          method: "PATCH",
          data: { ...v },
        });
      })}
    >
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
          <Button type="button" variant="outline" size="sm" disabled={!whatsappReady}
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
          {!whatsappReady && <p className="w-full text-xs text-muted-foreground">Preencha e salve o WhatsApp abaixo para ativar o link de agendamento.</p>}
        </div>
      </section>
      <Tabs defaultValue="empresa">
        <TabsList className="mb-6">
          <TabsTrigger value="empresa" className="gap-2">
            <Building2 size={15} />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="horarios" className="gap-2">
            <Clock3 size={15} />
            Funcionamento
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
                {input("cnpj", "CNPJ")}
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
      </Tabs>
      <div className="mt-5 max-w-3xl rounded-xl border border-border p-4 text-sm text-muted-foreground">
        Os serviços e preços são gerenciados em Gestão → Serviços pelo administrador. O funcionário trabalha somente em Clientes, Comandas e Agendamentos.
      </div>
    </form>
  );
}
