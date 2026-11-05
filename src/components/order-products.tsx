"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Status } from "@/types";

type Produto = {
  id: string; nome: string; preco: number; estoque: number; ativo: boolean;
  categoria: "BEBIDA" | "ALIMENTO" | "OUTROS";
};
type Item = {
  id: string; produtoId: string; nome: string; preco: number;
  quantidade: number; baixadoEm: string | null;
};
async function getData<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json() as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "Falha ao consultar produtos.");
  return data;
}

export function OrderProducts({ id, status, onChanged }: {
  id: string; status: Status; onChanged: () => Promise<void>;
}) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef<string | null>(null);
  const editavel = status === "AGUARDANDO" || status === "EM_LAVAGEM";

  const load = useCallback(async () => {
    const [p, i] = await Promise.all([
      getData<{ produtos: Produto[] }>("/api/produtos"),
      getData<{ itens: Item[] }>("/api/comandas/" + encodeURIComponent(id) + "/produtos"),
    ]);
    setProdutos(p.produtos);
    setItens(i.itens);
  }, [id]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); request.current = null;
    void load().catch(e => { if (active) setError(e instanceof Error ? e.message : "Falha na consulta."); })
      .finally(() => { if(active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  async function add() {
    if (!produtoId || !editavel || busy) return;
    setBusy(true);
    if (!request.current) request.current = crypto.randomUUID();
    try {
      const response = await fetch("/api/comandas/" + encodeURIComponent(id) + "/produtos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId, quantidade, requestId: request.current }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Não foi possível incluir o produto.");
      request.current = null;
      setQuantidade(1);
      toast.success("Produto incluído na comanda; estoque reservado até a finalização.");
      await Promise.all([load(), onChanged()]);
    } catch(e) {
      toast.error(e instanceof Error ? e.message : "Falha ao incluir produto.");
    } finally { setBusy(false); }
  }
  async function remove(itemId: string) {
    if (!editavel || busy) return;
    setBusy(true);
    try {
      const response = await fetch(
        "/api/comandas/" + encodeURIComponent(id) + "/produtos/" + encodeURIComponent(itemId),
        { method: "DELETE" },
      );
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Não foi possível remover o produto.");
      toast.success("Produto removido; total corrigido.");
      await Promise.all([load(), onChanged()]);
    } catch(e) { toast.error(e instanceof Error ? e.message : "Falha ao remover."); }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-border p-4" aria-label="Produtos e alimentação da comanda">
    <h3 className="flex items-center gap-2 text-sm font-semibold"><ShoppingBasket size={17}/> Bebidas, alimentos e produtos</h3>
    <p className="mt-1 text-xs text-muted-foreground">Mercadorias são separadas dos serviços. O tempo previsto da lavagem não muda.</p>
    {loading && <p className="mt-3 text-xs text-muted-foreground">Carregando mercadorias...</p>}
    {error && <p role="alert" className="mt-2 rounded-lg border border-amber-300 p-2 text-xs text-amber-700">{error}</p>}
    {itens.length>0 && <div className="mt-3 divide-y divide-border rounded-lg border">
      {itens.map(item=><div key={item.id} className="flex items-center justify-between gap-3 p-3 text-sm">
        <div><p className="font-medium">{item.quantidade}× {item.nome}</p><p className="text-xs text-muted-foreground">{money(item.preco)} cada · {item.baixadoEm?"Vendido":"Reservado"}</p></div>
        <div className="flex items-center gap-2"><strong>{money(item.quantidade*item.preco)}</strong>
          {editavel && <Button size="sm" variant="ghost" disabled={busy} onClick={()=>void remove(item.id)} aria-label={"Remover "+item.nome}><Trash2 size={15}/></Button>}
        </div>
      </div>)}
    </div>}
    {!loading && !error && itens.length===0 && <p className="mt-3 text-xs text-muted-foreground">Nenhum produto incluído nesta comanda.</p>}
    {editavel && !error && <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_76px_auto]">
      <select aria-label="Produto" value={produtoId} onChange={e=>{setProdutoId(e.target.value);request.current=null;}}
        className="h-10 min-w-0 rounded-md border border-input bg-background px-2 text-sm">
        <option value="">Selecione uma bebida ou produto</option>
        {produtos.filter(p=>p.ativo && p.estoque>0).map(p=>
          <option key={p.id} value={p.id}>{p.nome} · {money(p.preco)} · {p.estoque} un.</option>)}
      </select>
      <Input aria-label="Quantidade" type="number" min="1" max="100" step="1" value={quantidade}
        onChange={e=>{setQuantidade(Number(e.target.value)); request.current=null;}}/>
      <Button disabled={busy||!produtoId||!Number.isInteger(quantidade)||quantidade<1||quantidade>100}
        onClick={()=>void add()}><Plus size={15}/> Adicionar</Button>
    </div>}
    {editavel && !loading && !error && produtos.filter(p=>p.ativo).length===0 &&
      <p className="mt-2 text-xs text-muted-foreground">O proprietário ainda não cadastrou produtos para venda.</p>}
  </section>;
}
