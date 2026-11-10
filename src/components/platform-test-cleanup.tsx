"use client";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlatformTestCleanup({ onDone }: { onDone: () => void }) {
  const [preview, setPreview] = useState<{elegiveis:number; protegidos:number}|null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const atualizar = useCallback(async () => {
    setLoading(true); setError(""); setConfirmation("");
    try {
      const response = await fetch("/api/plataforma/solicitacoes/limpar-testes", {cache:"no-store"});
      const result = await response.json() as {elegiveis?:number; protegidos?:number; error?:string};
      if (!response.ok) throw new Error(result.error || "Falha ao verificar cadastros.");
      setPreview({elegiveis:result.elegiveis ?? 0, protegidos:result.protegidos ?? 0});
    } catch (cause) {
      setPreview(null);
      setError(cause instanceof Error ? cause.message : "Erro ao verificar cadastros.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void atualizar(); }, [atualizar]);

  async function limpar() {
    if (!preview?.elegiveis || confirmation !== "LIMPAR TESTES" || loading) return;
    if (!window.confirm("Excluir definitivamente " + preview.elegiveis +
      " solicitações legadas de teste não aprovadas? Empresas ativadas e dados operacionais não serão apagados.")) return;
    setLoading(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/plataforma/solicitacoes/limpar-testes", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({confirmacao:"LIMPAR TESTES", quantidade:preview.elegiveis}),
      });
      const result = await response.json() as {removidos?:number; error?:string};
      if (!response.ok) throw new Error(result.error || "Falha ao limpar cadastros.");
      setNotice((result.removidos ?? 0) + " solicitações de teste excluídas.");
      onDone();
      await atualizar();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao limpar cadastros.");
    } finally { setLoading(false); }
  }
  return <section className="my-5 rounded-xl border border-amber-500/30 bg-card p-4" aria-label="Limpeza de cadastros de teste">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold"><AlertTriangle size={16} className="text-amber-500"/> Limpar cadastros de teste</h3>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
          Remove apenas solicitações antigas de teste pendentes/rejeitadas, sem aprovação nem início de licença.
          Cadastros de empresas ativas, bancos Neon, assinaturas Stripe, usuários e histórico operacional estão protegidos.
        </p>
      </div>
      <Button type="button" size="sm" variant="outline" disabled={loading} onClick={()=>void atualizar()}>
        <RefreshCw size={14}/> Atualizar
      </Button>
    </div>
    <p className="mt-3 text-xs text-muted-foreground">
      {loading && !preview ? "Consultando..." : preview ?
        preview.elegiveis + " elegíveis para remoção · " + preview.protegidos + " protegidos" : "Prévia indisponível"}
    </p>
    <div className="mt-3 flex flex-wrap gap-2">
      <input value={confirmation} onChange={e=>setConfirmation(e.target.value)} type="text"
        autoComplete="off" aria-label="Digite LIMPAR TESTES para confirmar" placeholder="Digite LIMPAR TESTES"
        className="h-10 min-w-[200px] flex-1 rounded-lg border border-input bg-background px-3 text-sm"/>
      <Button type="button" variant="destructive" disabled={loading || !preview?.elegiveis || confirmation!=="LIMPAR TESTES"}
        onClick={()=>void limpar()}>
        {loading?<Loader2 size={14} className="animate-spin"/>:<Trash2 size={14}/>}
        Excluir cadastros elegíveis
      </Button>
    </div>
    {error&&<p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    {notice&&<p role="status" className="mt-2 text-xs text-emerald-600">{notice}</p>}
  </section>;
}
