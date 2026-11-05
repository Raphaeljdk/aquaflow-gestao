"use client";
import { useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/hooks/use-store";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function OrderProductReturn({orderId,item,onChanged}:{
  orderId:string;
  item:{id:string;nome:string;quantidade:number;devolvido?:number;preco:number};
  onChanged:()=>Promise<void>;
}) {
  const { user }=useStore();
  const [open,setOpen]=useState(false);
  const [quantidade,setQuantidade]=useState(1);
  const [motivo,setMotivo]=useState("");
  const [reporAoEstoque,setReporAoEstoque]=useState(false);
  const [reembolsoConfirmado,setReembolsoConfirmado]=useState(false);
  const [busy,setBusy]=useState(false);
  const requestId=useRef<string|null>(null);
  if(user?.role!=="ADMIN")return null;
  const restante=item.quantidade-(item.devolvido??0);
  if(restante<=0)return null;
  function close() {
    if(busy)return;
    setOpen(false);requestId.current=null;
    setQuantidade(1);setMotivo("");setReporAoEstoque(false);setReembolsoConfirmado(false);
  }
  async function submit() {
    if(busy||!reembolsoConfirmado||motivo.trim().length<5||quantidade<1||quantidade>restante)return;
    if(!requestId.current)requestId.current=crypto.randomUUID();
    setBusy(true);
    try{
      const response=await fetch("/api/comandas/"+encodeURIComponent(orderId)+"/produtos/"+encodeURIComponent(item.id)+"/devolucoes",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({requestId:requestId.current,quantidade,motivo,reporAoEstoque,reembolsoConfirmado:true}),
      });
      const data=await response.json() as {error?:string};
      if(!response.ok)throw new Error(data.error||"Falha ao registrar devolução.");
      requestId.current=null;
      setOpen(false);
      setQuantidade(1);setMotivo("");setReporAoEstoque(false);setReembolsoConfirmado(false);
      toast.success("Devolução registrada, histórico preservado e total da comanda ajustado.");
      await onChanged();
    }catch(e){
      toast.error(e instanceof Error?e.message:"Falha ao registrar devolução.");
    }finally{setBusy(false);}
  }
  return <>
    <Button size="sm" variant="outline" onClick={()=>setOpen(true)}><RotateCcw size={13}/> Devolver</Button>
    <Dialog open={open} onOpenChange={v=>{if(!v)close();}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Devolução de {item.nome}</DialogTitle>
          <DialogDescription>O sistema registra o reembolso e repõe estoque se você confirmar. Não estorna Pix ou cartão automaticamente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div><Label>Quantidade (máximo {restante})</Label>
            <Input type="number" min={1} max={restante} step="1" value={quantidade}
              onChange={e=>{setQuantidade(Number(e.target.value));requestId.current=null;}}/>
            <p className="mt-1 text-xs text-muted-foreground">Valor a devolver: {money(item.preco*quantidade)}</p>
          </div>
          <div><Label>Motivo da devolução</Label>
            <Input placeholder="Produto devolvido, erro de venda..." value={motivo}
              onChange={e=>{setMotivo(e.target.value);requestId.current=null;}}/>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={reporAoEstoque} onChange={e=>{setReporAoEstoque(e.target.checked);requestId.current=null;}} className="mt-1 size-4"/>
            Produto devolvido está intacto e deve voltar ao estoque de venda
          </label>
          <label className="flex items-start gap-2 rounded-lg border border-amber-300 p-3 text-sm">
            <input type="checkbox" checked={reembolsoConfirmado} onChange={e=>setReembolsoConfirmado(e.target.checked)} className="mt-1 size-4"/>
            Confirmo que o valor já foi restituído ao cliente pelo meio de pagamento apropriado. O sistema não movimenta o banco.
          </label>
          <Button className="w-full" disabled={busy||!reembolsoConfirmado||motivo.trim().length<5||!Number.isInteger(quantidade)||quantidade<1||quantidade>restante}
            onClick={()=>void submit()}>{busy?"Registrando...":"Confirmar devolução manual"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
