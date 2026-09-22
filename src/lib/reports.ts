import type { AppData } from "@/types";
import { paymentLabels } from "@/types";
import { dayKey, dateLabel, money } from "./format";
export function reportRows(data: AppData, start: string, end: string) {
  return data.comandas
    .filter(
      (o) =>
        o.finalizadoEm &&
        ["FINALIZADO", "ENTREGUE"].includes(o.status) &&
        dayKey(o.finalizadoEm) >= start &&
        dayKey(o.finalizadoEm) <= end,
    )
    .map((o) => ({
      numero: o.numero,
      data: dateLabel(o.finalizadoEm!),
      cliente: data.clientes.find((c) => c.id === o.clienteId)?.nome ?? "",
      placa: data.veiculos.find((v) => v.id === o.veiculoId)?.placa ?? "",
      servicos: o.itens.map((i) => i.quantidade + "x " + i.nome).join(", "),
      funcionarioId: o.funcionarioId,
      funcionario:
        data.funcionarios.find((f) => f.id === o.funcionarioId)?.nome ??
        "Sem responsável",
      pagamento: o.formaPagamento ? paymentLabels[o.formaPagamento] : "",
      desconto: o.desconto,
      total: o.total,
      comissao: o.comissao,
    }));
}
export type ReportRow = ReturnType<typeof reportRows>[number];
const headers = [
  "Comanda",
  "Finalizado em",
  "Cliente",
  "Placa",
  "Serviços",
  "Funcionário",
  "Pagamento",
  "Desconto",
  "Total",
  "Comissão",
];
function safe(value: unknown) {
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
export function csvReport(rows: ReportRow[]) {
  return (
    "\uFEFF" +
    [
      headers,
      ...rows.map((r) => [
        r.numero,
        r.data,
        r.cliente,
        r.placa,
        r.servicos,
        r.funcionario,
        r.pagamento,
        r.desconto.toFixed(2).replace(".", ","),
        r.total.toFixed(2).replace(".", ","),
        r.comissao.toFixed(2).replace(".", ","),
      ]),
    ]
      .map((row) => row.map(safe).join(";"))
      .join("\r\n")
  );
}
export async function pdfReport(
  rows: ReportRow[],
  company: string,
  start: string,
  end: string,
) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(20);
  doc.setTextColor(10, 93, 126);
  doc.text(company, 14, 20);
  doc.setFontSize(11);
  doc.setTextColor(70);
  doc.text("Relatório de faturamento | " + start + " a " + end, 14, 29);
  doc.text(
    rows.length +
      " atendimentos | Recebido: " +
      money(rows.reduce((s, r) => s + r.total, 0)) +
      " | Comissões: " +
      money(rows.reduce((s, r) => s + r.comissao, 0)),
    14,
    38,
  );
  autoTable(doc, {
    startY: 46,
    head: [
      [
        "Nº",
        "Data",
        "Cliente",
        "Placa",
        "Serviços",
        "Responsável",
        "Pagamento",
        "Total",
        "Comissão",
      ],
    ],
    body: rows.map((r) => [
      r.numero,
      r.data,
      r.cliente,
      r.placa,
      r.servicos,
      r.funcionario,
      r.pagamento,
      money(r.total),
      money(r.comissao),
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [7, 156, 206] },
    alternateRowStyles: { fillColor: [244, 248, 251] },
    margin: { left: 14, right: 14 },
  });
  return doc.output("arraybuffer");
}
