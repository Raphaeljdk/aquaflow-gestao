"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Package, Pencil, Search } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { canManage } from "@/lib/permissions";
import { materialSchema, movimentoEstoqueSchema } from "@/lib/validations";
import { money, dateLabel } from "@/lib/format";
import type { Material } from "@/types";
import { PageTitle } from "./common";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

type MaterialForm = { nome: string; unidade: "un" | "L" | "ml" | "kg" | "g"; minimo: number; custoUnitario: number; ativo: boolean };
type MovementForm = { materialId: string; tipo: "ENTRADA" | "SAIDA"; quantidade: number; observacao: string };
const units: MaterialForm["unidade"][] = ["un", "L", "ml", "kg", "g"];
const quantity = (value: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value);

export function StockPage() {
  const { data, user, mutate, busy } = useStore();
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<Material | "new" | null>(null);
  const [movement, setMovement] = useState<{ materialId: string; tipo: "ENTRADA" | "SAIDA" } | null>(null);
  if (!data) return null;
  const active = data.materiais.filter((x) => x.ativo);
  const low = active.filter((x) => x.quantidade <= x.minimo);
  const filtered = active.filter((x) => x.nome.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  return <>
    <PageTitle title="Estoque de materiais" description="Controle os insumos usados na operação e acompanhe cada entrada e saída." action={canManage(user?.role ?? "LAVADOR") ? () => setEditor("new") : undefined} actionLabel="Novo material" />
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <Stat label="Materiais ativos" value={String(active.length)} />
      <Stat label="Abaixo do mínimo" value={String(low.length)} attention={low.length > 0} />
      <Stat label="Valor em estoque" value={money(active.reduce((total, x) => total + x.quantidade * x.custoUnitario, 0))} />
    </div>
    {low.length > 0 && <div role="status" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><strong>Reposição necessária:</strong> {low.map((x) => x.nome).join(", ")}.</div>}
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><h2 className="text-lg font-semibold">Materiais</h2><div className="relative"><Search size={16} className="absolute left-3 top-3 text-muted-foreground" /><Input aria-label="Buscar material" placeholder="Buscar material" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" /></div></div>
      <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Saldo</TableHead><TableHead>Mínimo</TableHead><TableHead>Custo unitário</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
        {filtered.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.nome}</TableCell><TableCell><span className={item.quantidade <= item.minimo ? "font-semibold text-amber-700 dark:text-amber-300" : ""}>{quantity(item.quantidade)} {item.unidade}</span></TableCell><TableCell>{quantity(item.minimo)} {item.unidade}</TableCell><TableCell>{money(item.custoUnitario)}</TableCell><TableCell><div className="flex justify-end gap-1"><Button size="sm" variant="outline" onClick={() => setMovement({ materialId: item.id, tipo: "ENTRADA" })}><ArrowDown size={14} /> Entrada</Button><Button size="sm" variant="outline" onClick={() => setMovement({ materialId: item.id, tipo: "SAIDA" })}><ArrowUp size={14} /> Saída</Button>{canManage(user?.role ?? "LAVADOR") && <Button size="icon" variant="ghost" aria-label={`Editar ${item.nome}`} onClick={() => setEditor(item)}><Pencil size={15} /></Button>}</div></TableCell></TableRow>)}
        {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Nenhum material encontrado.</TableCell></TableRow>}
      </TableBody></Table></div>
    </section>
    <section className="panel mt-6 overflow-hidden"><div className="border-b border-border p-5"><h2 className="text-lg font-semibold">Movimentações recentes</h2><p className="text-sm text-muted-foreground">Histórico de entradas e saídas</p></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Material</TableHead><TableHead>Tipo</TableHead><TableHead>Quantidade</TableHead><TableHead>Observação</TableHead></TableRow></TableHeader><TableBody>
      {data.movimentosEstoque.slice(0, 30).map((entry) => <TableRow key={entry.id}><TableCell className="whitespace-nowrap">{dateLabel(entry.createdAt)}</TableCell><TableCell>{data.materiais.find((x) => x.id === entry.materialId)?.nome ?? "Material removido"}</TableCell><TableCell className={entry.tipo === "ENTRADA" ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}>{entry.tipo === "ENTRADA" ? "Entrada" : "Saída"}</TableCell><TableCell>{quantity(entry.quantidade)} {data.materiais.find((x) => x.id === entry.materialId)?.unidade}</TableCell><TableCell>{entry.observacao || "—"}</TableCell></TableRow>)}
      {data.movimentosEstoque.length === 0 && <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">As movimentações aparecerão aqui.</TableCell></TableRow>}
    </TableBody></Table></div></section>
    {editor && <MaterialDialog key={editor === "new" ? "new" : editor.id} item={editor === "new" ? null : editor} busy={busy} onClose={() => setEditor(null)} onSave={async (values) => { if (await mutate({ entity: "materiais", method: editor === "new" ? "POST" : "PATCH", id: editor === "new" ? undefined : editor.id, data: values })) setEditor(null); }} />}
    {movement && <MovementDialog key={movement.materialId + movement.tipo} value={movement} material={data.materiais.find((x) => x.id === movement.materialId)!} busy={busy} onClose={() => setMovement(null)} onSave={async (values) => { if (await mutate({ entity: "movimentosEstoque", method: "POST", data: values })) setMovement(null); }} />}
  </>;
}
function Stat({ label, value, attention = false }: { label: string; value: string; attention?: boolean }) {
  return <div className="panel flex items-center gap-4 p-5"><span className="rounded-xl bg-primary/10 p-3 text-primary"><Package size={20} /></span><div><p className="text-sm text-muted-foreground">{label}</p><p className={`text-2xl font-semibold ${attention ? "text-amber-700 dark:text-amber-300" : ""}`}>{value}</p></div></div>;
}
function MaterialDialog({ item, busy, onClose, onSave }: { item: Material | null; busy: boolean; onClose: () => void; onSave: (v: MaterialForm) => Promise<void> }) {
  const form = useForm<MaterialForm>({ resolver: zodResolver(materialSchema), defaultValues: item ? { ...item } : { nome: "", unidade: "un", minimo: 0, custoUnitario: 0, ativo: true } });
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>{item ? "Editar material" : "Novo material"}</DialogTitle><DialogDescription>O saldo é alterado por entradas e saídas registradas.</DialogDescription></DialogHeader><form onSubmit={form.handleSubmit(onSave)} className="space-y-4"><div><Label htmlFor="material-name">Nome</Label><Input id="material-name" {...form.register("nome")} />{form.formState.errors.nome && <p className="text-sm text-destructive">{form.formState.errors.nome.message}</p>}</div><div className="grid grid-cols-2 gap-4"><div><Label htmlFor="material-unit">Unidade</Label><select id="material-unit" className="h-10 w-full rounded-md border border-input bg-background px-3" {...form.register("unidade")}>{units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></div><div><Label htmlFor="material-min">Estoque mínimo</Label><Input id="material-min" type="number" min="0" step="0.001" {...form.register("minimo")} />{form.formState.errors.minimo && <p className="text-sm text-destructive">{form.formState.errors.minimo.message}</p>}</div></div><div><Label htmlFor="material-cost">Custo unitário (R$)</Label><Input id="material-cost" type="number" min="0" step="0.01" {...form.register("custoUnitario")} />{form.formState.errors.custoUnitario && <p className="text-sm text-destructive">{form.formState.errors.custoUnitario.message}</p>}</div>{item && <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("ativo")} /> Material ativo</label>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>Salvar material</Button></div></form></DialogContent></Dialog>;
}
function MovementDialog({ value, material, busy, onClose, onSave }: { value: { materialId: string; tipo: "ENTRADA" | "SAIDA" }; material: Material; busy: boolean; onClose: () => void; onSave: (v: MovementForm) => Promise<void> }) {
  const form = useForm<MovementForm>({ resolver: zodResolver(movimentoEstoqueSchema), defaultValues: { ...value, quantidade: 1, observacao: "" } });
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>{value.tipo === "ENTRADA" ? "Registrar entrada" : "Registrar saída"}</DialogTitle><DialogDescription>{material.nome} · saldo atual: {quantity(material.quantidade)} {material.unidade}</DialogDescription></DialogHeader><form onSubmit={form.handleSubmit(onSave)} className="space-y-4"><div><Label htmlFor="move-qty">Quantidade ({material.unidade})</Label><Input id="move-qty" type="number" min="0.001" step="0.001" {...form.register("quantidade")} />{form.formState.errors.quantidade && <p className="text-sm text-destructive">{form.formState.errors.quantidade.message}</p>}</div><div><Label htmlFor="move-note">Motivo / observação</Label><Input id="move-note" placeholder="Ex.: compra de insumos, consumo na operação" {...form.register("observacao")} /></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>Confirmar {value.tipo === "ENTRADA" ? "entrada" : "saída"}</Button></div></form></DialogContent></Dialog>;
}
