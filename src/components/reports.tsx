"use client";
import { useState } from "react";
import {
  FileDown,
  FileText,
  Download,
  TrendingUp,
  Banknote,
  Receipt,
  Users,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { toast } from "sonner";
import { useStore, DEMO } from "@/hooks/use-store";
import { PageTitle, PanelHeading, Empty } from "./common";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { dayKey, dateLabel, money } from "@/lib/format";
import { reportRows, csvReport, pdfReport } from "@/lib/reports";
import { canManage } from "@/lib/permissions";
export function Reports() {
  const { data, user } = useStore(),
    [start, setStart] = useState(dateLabel(new Date(), "yyyy-MM") + "-01"),
    [end, setEnd] = useState(dayKey(new Date())),
    [exporting, setExporting] = useState(false);
  if (!data || !user) return null;
  if (!canManage(user.role))
    return (
      <Empty
        title="Acesso restrito"
        text="Os relatórios estão disponíveis para administradores e gerentes."
      />
    );
  const invalid = !start || !end || start > end,
    rows = invalid ? [] : reportRows(data, start, end),
    revenue = rows.reduce((s, r) => s + r.total, 0),
    commission = rows.reduce((s, r) => s + r.comissao, 0);
  const pay = ["PIX", "Crédito", "Débito", "Dinheiro"].map((name) => ({
    name,
    value: rows
      .filter((r) => r.pagamento === name)
      .reduce((s, r) => s + r.total, 0),
  }));
  const productivity = data.funcionarios
    .filter((f) => f.cargo === "LAVADOR")
    .map((f) => {
      const r = rows.filter((r) => r.funcionarioId === f.id);
      return {
        id: f.id,
        nome: f.nome,
        quantidade: r.length,
        total: r.reduce((n, r) => n + r.total, 0),
        comissao: r.reduce((n, r) => n + r.comissao, 0),
      };
    })
    .sort((a, b) => b.quantidade - a.quantidade);
  const download = async (type: "csv" | "pdf") => {
    setExporting(true);
    try {
      let blob: Blob;
      if (DEMO) {
        blob =
          type === "csv"
            ? new Blob([csvReport(rows)], { type: "text/csv;charset=utf-8" })
            : new Blob(
                [await pdfReport(rows, data.configuracao.nome, start, end)],
                { type: "application/pdf" },
              );
      } else {
        const res = await fetch(
          "/api/relatorios?formato=" +
            type +
            "&inicio=" +
            start +
            "&fim=" +
            end,
        );
        if (!res.ok) throw Error((await res.json()).error);
        blob = await res.blob();
      }
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "aquaflow-relatorio-" + start + "-" + end + "." + type;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Relatório exportado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar.");
    } finally {
      setExporting(false);
    }
  };
  return (
    <>
      <PageTitle
        title="Relatórios"
        description="Transforme seus atendimentos em decisões mais claras."
      >
        <Button
          variant="outline"
          disabled={invalid || exporting}
          onClick={() => void download("csv")}
        >
          <Download size={15} />
          CSV
        </Button>
        <Button
          disabled={invalid || exporting}
          onClick={() => void download("pdf")}
        >
          {exporting ? (
            <Loader2 className="animate-spin" size={15} />
          ) : (
            <FileText size={15} />
          )}
          Exportar PDF
        </Button>
      </PageTitle>
      <div className="panel mb-6 flex flex-wrap items-end gap-4 p-5">
        <div className="space-y-2">
          <Label htmlFor="start">Data inicial</Label>
          <Input
            id="start"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end">Data final</Label>
          <Input
            id="end"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            setStart(dayKey(new Date()));
            setEnd(dayKey(new Date()));
          }}
        >
          Hoje
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            const d = new Date();
            d.setDate(d.getDate() - 29);
            setStart(dayKey(d));
            setEnd(dayKey(new Date()));
          }}
        >
          Últimos 30 dias
        </Button>
        {invalid && (
          <p className="text-sm text-destructive">Informe um período válido.</p>
        )}
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Faturamento recebido",
            value: money(revenue),
            icon: Banknote,
          },
          {
            title: "Atendimentos concluídos",
            value: rows.length,
            icon: Receipt,
          },
          {
            title: "Ticket médio",
            value: money(rows.length ? revenue / rows.length : 0),
            icon: TrendingUp,
          },
          { title: "Comissões geradas", value: money(commission), icon: Users },
        ].map((m) => (
          <div className="panel p-5" key={m.title}>
            <div className="flex justify-between text-muted-foreground">
              <p className="text-xs">{m.title}</p>
              <m.icon size={18} />
            </div>
            <p className="metric-number mt-4 text-3xl font-semibold">
              {m.value}
            </p>
          </div>
        ))}
      </div>
      <div className="mb-6 grid gap-5 xl:grid-cols-2">
        <section className="panel">
          <PanelHeading
            title="Formas de pagamento"
            subtitle="Participação no faturamento recebido"
          />
          <div className="h-64 px-5 pb-5">
            <ResponsiveContainer>
              <BarChart
                data={pay}
                layout="vertical"
                margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  horizontal={false}
                  strokeDasharray="4 4"
                />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? v / 1000 + "k" : v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  width={65}
                />
                <Tooltip
                  formatter={(v) => money(Number(v))}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={25}>
                  {pay.map((p, i) => (
                    <Cell
                      key={p.name}
                      fill={["#079cce", "#37b6d8", "#72cce2", "#acdfee"][i]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel">
          <PanelHeading
            title="Produtividade da equipe"
            subtitle="Atendimentos e comissões no período"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Funcionário</TableHead>
                <TableHead>Concluídos</TableHead>
                <TableHead>Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productivity.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="py-4 pl-6 font-medium">
                    {f.nome}
                  </TableCell>
                  <TableCell>{f.quantidade}</TableCell>
                  <TableCell className="font-medium text-primary">
                    {money(f.comissao)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="px-6 py-5 text-xs text-muted-foreground">
            Comissões calculadas sobre o total após descontos, com a taxa
            registrada na finalização.
          </p>
        </section>
      </div>
      <section className="panel overflow-hidden">
        <PanelHeading
          title="Movimentações do período"
          subtitle="Receita reconhecida na finalização do atendimento"
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Comanda</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Comissão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 50).map((r) => (
              <TableRow key={r.numero}>
                <TableCell className="pl-6 font-medium">#{r.numero}</TableCell>
                <TableCell className="text-xs">{r.data}</TableCell>
                <TableCell>{r.cliente}</TableCell>
                <TableCell>{r.pagamento}</TableCell>
                <TableCell className="font-semibold">
                  {money(r.total)}
                </TableCell>
                <TableCell>{money(r.comissao)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!rows.length && (
          <Empty
            title="Nenhum pagamento no período"
            text="Ajuste as datas para consultar outros atendimentos."
          />
        )}
        {rows.length > 50 && (
          <p className="p-5 text-xs text-muted-foreground">
            Exibindo 50 de {rows.length}. A exportação inclui todos os
            registros.
          </p>
        )}
      </section>
    </>
  );
}
