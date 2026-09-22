"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Save,
  Building2,
  Clock3,
  Upload,
  Droplets,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/hooks/use-store";
import { PageTitle, Choice } from "./common";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { configuracaoSchema } from "@/lib/validations";
import { ErrorText } from "./forms/order-form";
import type { Configuracao } from "@/types";
import Link from "next/link";
export function Settings() {
  const { data } = useStore();
  return data ? <SettingsForm initial={data.configuracao} /> : null;
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
  async function upload(file?: File) {
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
      f.setValue("logo", String(reader.result), { shouldDirty: true });
    reader.readAsDataURL(file);
  }
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
          <section className="panel max-w-3xl p-6">
            <h2 className="mb-1 text-lg font-semibold">Dados da empresa</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Informações usadas no sistema e nos relatórios.
            </p>
            <div className="mb-7 flex flex-wrap items-center gap-5">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-accent">
                {values.logo ? (
                  <img
                    src={values.logo}
                    alt="Logo da empresa"
                    className="size-full object-contain"
                  />
                ) : (
                  <Droplets size={35} className="text-primary" />
                )}
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
                  onChange={(e) => void upload(e.target.files?.[0])}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  PNG, JPG ou WebP. Máximo 300 KB.
                </p>
                {values.logo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 px-0 text-destructive"
                    onClick={() => f.setValue("logo", "")}
                  >
                    Remover logo
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-5">
              {input("nome", "Nome da empresa")}
              <div className="grid gap-5 sm:grid-cols-2">
                {input("cnpj", "CNPJ")}
                {input("telefone", "Telefone", "tel")}
              </div>
              {input("endereco", "Endereço")}
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
        Para alterar os preços e a duração dos atendimentos, acesse o{" "}
        <Link
          href="/servicos"
          className="font-medium text-primary underline underline-offset-4"
        >
          catálogo de serviços
        </Link>
        .
      </div>
    </form>
  );
}
