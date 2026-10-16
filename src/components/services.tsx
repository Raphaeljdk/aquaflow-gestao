"use client";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Search, Clock3, CircleCheck, CircleOff } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { canManage } from "@/lib/permissions";
import { servicoSchema } from "@/lib/validations";
import { money } from "@/lib/format";
import type { Servico } from "@/types";
import { PageTitle, Empty } from "./common";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

type ServiceForm = { nome: string; descricao: string; preco: number; duracaoMin: number; ativo: boolean };
const normalize = (value: string) => value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function ServicesPage() {
  const { data, user, mutate, busy } = useStore();
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<Servico | "new" | null>(null);
  if (!data || !user) return null;
  if (!canManage(user.role)) return <Empty title="Acesso restrito" text="Somente o administrador pode gerenciar serviços e preços." />;
  const active = data.servicos.filter((service) => service.ativo);
  const filtered = [...data.servicos]
    .filter((service) => normalize(service.nome).includes(normalize(query)))
    .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, "pt-BR"));
  async function save(values: ServiceForm) {
    const duplicate = data!.servicos.some((service) => service.id !== (editor === "new" ? undefined : editor?.id) && normalize(service.nome) === normalize(values.nome));
    if (duplicate) return "Já existe um serviço com esse nome.";
    const ok = await mutate({ entity: "servicos", method: editor === "new" ? "POST" : "PATCH", id: editor === "new" ? undefined : editor?.id, data: values });
    if (ok) setEditor(null);
    return ok ? null : "Não foi possível salvar. Confira a mensagem apresentada.";
  }
  async function toggle(service: Servico) {
    await mutate({ entity: "servicos", method: "PATCH", id: service.id, data: { nome: service.nome, descricao: service.descricao, preco: service.preco, duracaoMin: service.duracaoMin, ativo: !service.ativo } });
  }
  return <>
    <PageTitle title="Serviços" description="Crie serviços, atualize preços e controle quais opções aparecem nas comandas e agendamentos." action={() => setEditor("new")} actionLabel="Novo serviço" />
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      <Stat label="Serviços cadastrados" value={String(data.servicos.length)} />
      <Stat label="Serviços ativos" value={String(active.length)} />
      <Stat label="Inativos" value={String(data.servicos.length - active.length)} />
    </div>
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div><h2 className="text-lg font-semibold">Catálogo de serviços</h2><p className="text-sm text-muted-foreground">As alterações de preços valem para novas comandas. O histórico de atendimentos permanece preservado.</p></div>
        <div className="relative w-full sm:w-64"><Search size={16} className="absolute left-3 top-3 text-muted-foreground" /><Input aria-label="Buscar serviço" placeholder="Buscar serviço" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      </div>
      <div className="divide-y divide-border">
        {filtered.map((service) => <div key={service.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{service.nome}</p><span className={service.ativo ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400" : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"}>{service.ativo ? "Ativo" : "Inativo"}</span></div>
            {service.descricao && <p className="mt-1 text-sm text-muted-foreground">{service.descricao}</p>}
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 size={13} /> {service.duracaoMin} minutos</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
            <strong className="text-lg tabular-nums">{money(service.preco)}</strong>
            <Button size="sm" variant="outline" onClick={() => setEditor(service)}><Pencil size={14} /> Editar</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void toggle(service)}>{service.ativo ? <CircleOff size={14} /> : <CircleCheck size={14} />}{service.ativo ? "Desativar" : "Ativar"}</Button>
          </div>
        </div>)}
        {filtered.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">{query ? "Nenhum serviço encontrado." : "Nenhum serviço cadastrado. Clique em Novo serviço para começar."}</div>}
      </div>
    </section>
    {editor && <ServiceDialog key={editor === "new" ? "new" : editor.id} item={editor === "new" ? null : editor} busy={busy} onClose={() => setEditor(null)} onSave={save} />}
  </>;
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="panel p-4 sm:p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p></div>;
}
function ServiceDialog({ item, busy, onClose, onSave }: { item: Servico | null; busy: boolean; onClose: () => void; onSave: (values: ServiceForm) => Promise<string | null> }) {
  const [submitError, setSubmitError] = useState("");
  const form = useForm<ServiceForm>({ resolver: zodResolver(servicoSchema), defaultValues: item ? { nome: item.nome, descricao: item.descricao, preco: item.preco, duracaoMin: item.duracaoMin, ativo: item.ativo } : { nome: "", descricao: "", preco: 0, duracaoMin: 30, ativo: true } });
  return <Dialog open onOpenChange={(open) => !open && !busy && onClose()}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{item ? "Editar serviço" : "Novo serviço"}</DialogTitle><DialogDescription>Defina o preço e o tempo estimado usados no atendimento e na agenda.</DialogDescription></DialogHeader>
    <form onSubmit={form.handleSubmit(async (values) => setSubmitError((await onSave(values)) ?? ""))} className="space-y-4">
      <div className="space-y-1.5"><Label htmlFor="service-name">Nome do serviço</Label><Input id="service-name" placeholder="Ex.: Lavagem completa" {...form.register("nome")} />{form.formState.errors.nome && <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>}</div>
      <div className="space-y-1.5"><Label htmlFor="service-description">Descrição</Label><Input id="service-description" placeholder="O que está incluído" {...form.register("descricao")} />{form.formState.errors.descricao && <p className="text-xs text-destructive">{form.formState.errors.descricao.message}</p>}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="service-price">Preço (R$)</Label><Input id="service-price" type="number" min="0.01" max="100000" step="0.01" inputMode="decimal" {...form.register("preco", { valueAsNumber: true })} />{form.formState.errors.preco && <p className="text-xs text-destructive">{form.formState.errors.preco.message}</p>}</div>
        <div className="space-y-1.5"><Label htmlFor="service-duration">Duração (minutos)</Label><Input id="service-duration" type="number" min="15" max="600" step="1" {...form.register("duracaoMin", { valueAsNumber: true })} />{form.formState.errors.duracaoMin && <p className="text-xs text-destructive">{form.formState.errors.duracaoMin.message}</p>}</div>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" {...form.register("ativo")} /> Serviço ativo e disponível para novas comandas</label>
      {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
      <div className="flex flex-wrap justify-end gap-2 pt-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}><Plus size={15} />{item ? "Salvar alterações" : "Criar serviço"}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
