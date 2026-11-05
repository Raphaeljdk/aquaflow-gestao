"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PackagePlus, Search, Plus, Pencil, ArrowDownUp } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { money } from "@/lib/format";
import { PageTitle, Empty } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

type Produto = {
  id: string; nome: string; descricao: string; categoria: "BEBIDA" | "ALIMENTO" | "OUTROS";
  preco: number; estoque: number; estoqueMinimo: number; ativo: boolean;
};
type FormProduto = Omit<Produto, "id" | "estoque"> & { estoqueInicial: number };
const empty: FormProduto = {
  nome: "", descricao: "", categoria: "BEBIDA", preco: 0,
  estoqueMinimo: 0, ativo: true, estoqueInicial: 0,
};
const categorias: Record<Produto["categoria"], string> = {
  BEBIDA: "Bebidas", ALIMENTO: "Alimentos", OUTROS: "Outros produtos",
};
async function api(path: string, method = "GET", data?: unknown) {
  const response = await fetch(path, {
    method, cache: "no-store",
    ...(data === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
  });
  const body = await response.json() as { error?: string; produtos?: Produto[] };
  if (!response.ok) throw new Error(body.error || "Não foi possível acessar os produtos.");
  return body;
}

export function ProductsPage() {
  const { user } = useStore();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<Produto | "new" | null>(null);
  const [adjust, setAdjust] = useState<Produto | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormProduto>(empty);
  const [delta, setDelta] = useState(0);
  const [motivo, setMotivo] = useState("");
  const load = useCallback(async () => {
    try {
      const body = await api("/api/produtos");
      setProdutos(body.produtos ?? []);
      setError("");
    } catch(e) { setError(e instanceof Error ? e.message : "Falha ao carregar produtos."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => produtos.filter(p =>
    (p.nome + " " + p.descricao + " " + categorias[p.categoria]).toLocaleLowerCase("pt-BR")
      .includes(query.toLocaleLowerCase("pt-BR"))), [produtos, query]);
  if (!user || user.role !== "ADMIN")
    return <Empty title="Acesso restrito" text="O catálogo de produtos é administrado pelo proprietário." />;

  function openEditor(produto: Produto | "new") {
    setEditor(produto);
    setForm(produto === "new" ? { ...empty } : {
      nome: produto.nome, descricao: produto.descricao,
      categoria: produto.categoria, preco: produto.preco,
      estoqueMinimo: produto.estoqueMinimo, ativo: produto.ativo, estoqueInicial: 0,
    });
  }
  async function salvar() {
    if (saving) return;
    setSaving(true);
    try {
      await api(editor === "new" ? "/api/produtos" : "/api/produtos/" + (editor as Produto).id,
        editor === "new" ? "POST" : "PATCH", form);
      setEditor(null); toast.success("Produto salvo."); await load();
    } catch(e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }
  async function ajustarEstoque() {
    if (!adjust || !delta || saving) return;
    setSaving(true);
    try {
      await api("/api/produtos/" + adjust.id + "/estoque", "POST", { quantidade: delta, observacao: motivo });
      setAdjust(null); setDelta(0); setMotivo("");
      toast.success("Estoque atualizado e movimentação registrada."); await load();
    } catch(e) { toast.error(e instanceof Error ? e.message : "Não foi possível ajustar o saldo."); }
    finally { setSaving(false); }
  }
  return <div className="space-y-5">
    <PageTitle title="Produtos e alimentação"
      description="Cadastre bebidas, alimentos e produtos vendidos na comanda. Produtos não possuem duração e não entram no agendamento."
      action={() => openEditor("new")} actionLabel="Novo produto" />
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="panel p-4"><p className="text-xs text-muted-foreground">Produtos cadastrados</p><p className="mt-1 text-2xl font-bold">{produtos.length}</p></div>
      <div className="panel p-4"><p className="text-xs text-muted-foreground">Ativos</p><p className="mt-1 text-2xl font-bold">{produtos.filter(p=>p.ativo).length}</p></div>
      <div className="panel p-4"><p className="text-xs text-muted-foreground">Baixo estoque</p><p className="mt-1 text-2xl font-bold">{produtos.filter(p=>p.ativo && p.estoque<=p.estoqueMinimo).length}</p></div>
    </section>
    {error && <div role="alert" className="rounded-lg border border-amber-300 p-3 text-sm text-amber-700">{error}</div>}
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <h2 className="font-semibold">Catálogo de mercadorias</h2>
        <div className="relative"><Search size={16} className="absolute left-3 top-3 text-muted-foreground"/><Input placeholder="Buscar bebida ou alimento" value={query} onChange={e=>setQuery(e.target.value)} className="pl-9" /></div>
      </div>
      {loading ? <p className="p-5 text-sm text-muted-foreground">Carregando catálogo...</p> :
        filtered.length === 0 ? <p className="p-5 text-sm text-muted-foreground">Nenhum produto encontrado. Cadastre uma bebida ou alimento para começar.</p> :
        <div className="divide-y divide-border">{filtered.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{p.nome} <span className="ml-1 text-xs font-normal text-muted-foreground">{categorias[p.categoria]}</span></p>
            {p.descricao && <p className="text-xs text-muted-foreground">{p.descricao}</p>}
            <p className="mt-1 text-sm">{money(p.preco)} · <span className={p.estoque<=p.estoqueMinimo?"text-amber-600":"text-muted-foreground"}>{p.estoque} un. em estoque</span> · {p.ativo?"Ativo":"Inativo"}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={()=>{setAdjust(p);setDelta(0);setMotivo("");}}><ArrowDownUp size={14}/> Estoque</Button>
            <Button size="sm" variant="outline" onClick={()=>openEditor(p)}><Pencil size={14}/> Editar</Button>
          </div>
        </div>)}</div>}
    </section>
    {editor && <Dialog open onOpenChange={open=>!open&&!saving&&setEditor(null)}>
      <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{editor==="new"?"Novo produto":"Editar produto"}</DialogTitle><DialogDescription>Produtos são vendidos na comanda sem tempo de execução.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Coca-Cola 350 ml"/></div>
          <div><Label>Descrição</Label><Input value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})}/></div>
          <div><Label>Categoria</Label><select className="h-10 w-full rounded-md border border-input bg-background px-2" value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value as Produto["categoria"]})}>
            {Object.entries(categorias).map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Preço de venda (R$)</Label><Input type="number" min="0.01" step="0.01" value={form.preco} onChange={e=>setForm({...form,preco:Number(e.target.value)})}/></div>
            <div><Label>Estoque mínimo</Label><Input type="number" min="0" step="1" value={form.estoqueMinimo} onChange={e=>setForm({...form,estoqueMinimo:Number(e.target.value)})}/></div>
          </div>
          {editor==="new" && <div><Label>Estoque inicial (unidades)</Label><Input type="number" min="0" step="1" value={form.estoqueInicial} onChange={e=>setForm({...form,estoqueInicial:Number(e.target.value)})}/></div>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.ativo} onChange={e=>setForm({...form,ativo:e.target.checked})}/> Produto ativo para venda</label>
          <Button className="w-full" disabled={saving||form.nome.trim().length<2||form.preco<=0} onClick={()=>void salvar()}><PackagePlus size={16}/> {saving?"Salvando...":"Salvar produto"}</Button>
        </div>
      </DialogContent></Dialog>}
    {adjust && <Dialog open onOpenChange={open=>!open&&!saving&&setAdjust(null)}><DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>Estoque de {adjust.nome}</DialogTitle><DialogDescription>Saldo atual: {adjust.estoque} unidades. Valores negativos retiram itens, positivos adicionam.</DialogDescription></DialogHeader>
      <div className="space-y-3"><div><Label>Quantidade de ajuste (+/-)</Label><Input type="number" step="1" value={delta} onChange={e=>setDelta(Number(e.target.value))}/></div>
        <div><Label>Motivo</Label><Input value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Compra, perda, acerto de inventário..."/></div>
        <Button className="w-full" disabled={saving||delta===0||!Number.isInteger(delta)} onClick={()=>void ajustarEstoque()}><Plus size={16}/> Registrar movimentação</Button>
      </div>
    </DialogContent></Dialog>}
  </div>;
}
