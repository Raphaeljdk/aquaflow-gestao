import type { Vistoria, VistoriaItemId } from "@/types";

const pontos: Array<{ id: VistoriaItemId; label: string; x: number; y: number }> = [
  { id: "PARACHOQUES", label: "Para-choques", x: 50, y: 9 },
  { id: "FAROIS", label: "Faróis e lanternas", x: 77, y: 20 },
  { id: "PINTURA", label: "Pintura e riscos", x: 21, y: 34 },
  { id: "RETROVISORES", label: "Retrovisores", x: 80, y: 40 },
  { id: "VIDROS", label: "Vidros", x: 50, y: 49 },
  { id: "AMASSADOS", label: "Lataria e amassados", x: 20, y: 63 },
  { id: "RODAS_PNEUS", label: "Rodas e pneus", x: 78, y: 73 },
  { id: "INTERIOR", label: "Interior e objetos", x: 50, y: 86 },
];

type TipoVeiculo = "CARRO" | "MOTO" | "CAMINHONETE";
type Rgb = [number, number, number];
const navy: Rgb = [17, 24, 32];
const dark: Rgb = [23, 33, 43];
const yellow: Rgb = [245, 188, 46];
const green: Rgb = [26, 147, 106];
const gray: Rgb = [135, 148, 160];
const ink: Rgb = [36, 44, 54];

/**
 * Exporta a mesma vistoria visual da comanda em um documento A4 legível.
 * Não envia ou publica dados pessoais: o arquivo permanece no aparelho do atendente.
 * Os oito pontos correspondem às coordenadas do componente VehicleInspection.
 */
export async function gerarPdfVistoria(info: {
  numero: number;
  estabelecimento: string;
  cliente: string;
  telefone: string;
  veiculo: string;
  tipo?: TipoVeiculo;
  placa: string;
  criadoEm: string;
  vistoria: Vistoria;
}): Promise<File> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const status = (id: VistoriaItemId) => info.vistoria.itens.find((item) => item.id === id);
  const revisados = info.vistoria.itens.filter((i) => i.revisado);
  const avarias = revisados.filter((i) => i.defeito).length;
  const corretos = revisados.length - avarias;
  const pendentes = pontos.length - revisados.length;
  const tipo = info.tipo ?? "CARRO";
  const date = (s: string) => {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? "Não informado" : d.toLocaleString("pt-BR");
  };
  const color = (id: VistoriaItemId): Rgb => {
    const item = status(id);
    return !item?.revisado ? gray : item.defeito ? yellow : green;
  };

  // Cabeçalho profissional seguindo a identidade visual atual do ERP.
  doc.setFillColor(...navy);
  doc.rect(0, 0, 210, 35, "F");
  doc.setFillColor(...yellow);
  doc.rect(0, 0, 210, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text((info.estabelecimento || "Lava-rápido").slice(0, 54), 17, 17);
  doc.setFontSize(11);
  doc.text("VISTORIA DE ENTRADA - COMANDA #" + info.numero, 17, 26);

  const meta = [
    "Cliente: " + (info.cliente || "Não informado"),
    "Contato: " + (info.telefone || "Não informado"),
    "Veículo: " + (info.veiculo || "Não informado") + " (" + tipo.toLowerCase() + ")",
    "Placa: " + (info.placa || "Não informada"),
    "Abertura: " + date(info.criadoEm),
    "Vistoria atualizada: " + date(info.vistoria.atualizadoEm),
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(...ink);
  meta.forEach((line, i) => doc.text(line.slice(0, 95), i % 2 ? 111 : 17, 44 + Math.floor(i / 2) * 8));
  doc.setFillColor(240, 243, 246);
  doc.roundedRect(17, 71, 176, 12, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.3);
  doc.setTextColor(...ink);
  doc.text(corretos + " sem avaria", 25, 79);
  doc.text(avarias + " com avaria", 83, 79);
  doc.text(pendentes + " pendentes", 144, 79);

  // Cartão do mapa: desenho vetorial (não captura rasterizada da tela).
  const mx = 17, my = 91, mw = 75, mh = 132;
  doc.setFillColor(...dark);
  doc.roundedRect(mx, my, mw, mh, 4, 4, "F");
  doc.setFontSize(8.7);
  doc.setTextColor(255, 255, 255);
  doc.text("MAPA: " + tipo, mx + 6, my + 9);
  const cx = mx + mw / 2;
  const bodyTop = my + 16;
  const bodyHeight = 105;

  doc.setDrawColor(...yellow);
  doc.setLineWidth(0.65);
  if (tipo === "MOTO") {
    doc.setFillColor(45, 62, 77);
    doc.roundedRect(cx - 6, bodyTop + 4, 12, 20, 5, 5, "FD");
    doc.roundedRect(cx - 6, bodyTop + 79, 12, 20, 5, 5, "FD");
    doc.setFillColor(32, 48, 63);
    doc.roundedRect(cx - 10, bodyTop + 30, 20, 49, 7, 7, "FD");
    doc.setDrawColor(151, 166, 183);
    doc.line(cx - 14, bodyTop + 30, cx + 14, bodyTop + 30);
    doc.line(cx - 10, bodyTop + 78, cx + 10, bodyTop + 78);
  } else {
    doc.setFillColor(38, 55, 70);
    doc.roundedRect(cx - 17, bodyTop, 34, 105, 11, 11, "FD");
    doc.setDrawColor(155, 170, 183);
    doc.roundedRect(cx - 13, bodyTop + 17, 26, tipo === "CAMINHONETE" ? 33 : 56, 5, 5, "S");
    doc.line(cx - 12, bodyTop + 39, cx + 12, bodyTop + 39);
    doc.setDrawColor(...yellow);
    doc.line(cx - 12, bodyTop + 78, cx + 12, bodyTop + 78);
    if (tipo === "CAMINHONETE") {
      doc.setDrawColor(155, 170, 183);
      doc.roundedRect(cx - 13, bodyTop + 63, 26, 30, 2, 2, "S");
    }
    doc.setFillColor(13, 22, 30);
    for (const offset of [16, 77]) {
      doc.roundedRect(cx - 21, bodyTop + offset, 4, 18, 1, 1, "F");
      doc.roundedRect(cx + 17, bodyTop + offset, 4, 18, 1, 1, "F");
    }
  }
  pontos.forEach((p, index) => {
    const x = mx + 7 + p.x / 100 * (mw - 14);
    const y = my + 11 + p.y / 100 * (mh - 17);
    doc.setFillColor(...color(p.id));
    doc.setDrawColor(242, 247, 251);
    doc.setLineWidth(0.45);
    doc.circle(x, y, 4.25, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...navy);
    doc.text(String(index + 1), x, y + 2.2, { align: "center" });
  });

  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.6);
  doc.text("CHECKLIST DO VEÍCULO", 98, 95);
  let y = 101;

  const addPageIfNeeded = (height: number) => {
    if (y + height > 276) {
      doc.addPage();
      y = 20;
      doc.setTextColor(...ink);
    }
  };
  for (const [index, point] of pontos.entries()) {
    const item = status(point.id);
    const description = item?.observacao?.trim() || "";
    const lines = description ? (doc.splitTextToSize(description, 88) as string[]) : [];
    const rowHeight = 13 + Math.min(lines.length, 16) * 4.2;
    addPageIfNeeded(rowHeight + 2);
    doc.setFillColor(246, 248, 249);
    doc.roundedRect(98, y, 95, rowHeight, 2, 2, "F");
    doc.setFillColor(...color(point.id));
    doc.circle(103, y + 5.3, 2.2, "F");
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.text((index + 1) + ". " + point.label, 108, y + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.3);
    doc.text(!item?.revisado ? "PENDENTE" : item.defeito ? "AVARIA REGISTRADA" : "SEM AVARIA APARENTE", 108, y + 10);
    if (description) {
      doc.setTextColor(82, 94, 107);
      doc.setFontSize(7.1);
      lines.slice(0, 16).forEach((line, i) => doc.text(line, 101, y + 15 + i * 4.2));
    }
    y += rowHeight + 2;
  }

  y = Math.max(y + 7, doc.getNumberOfPages() === 1 ? 232 : 20);
  const obs = info.vistoria.observacoesGerais.trim() || "Nenhuma observação registrada.";
  const obsLines = doc.splitTextToSize(obs, 172) as string[];
  addPageIfNeeded(15 + obsLines.length * 4.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...ink);
  doc.text("OBSERVAÇÕES GERAIS", 17, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.4);
  obsLines.forEach((line, i) => doc.text(line, 17, y + 7 + i * 4.5));

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(220, 226, 231);
    doc.line(17, 283, 193, 283);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(105, 116, 126);
    doc.text("Registro visual do estado aparente do veículo. Não substitui laudo técnico.", 17, 289);
    doc.text(p + "/" + pageCount, 192, 289, { align: "right" });
  }
  return new File([doc.output("blob")], "vistoria-comanda-" + info.numero + ".pdf", { type: "application/pdf" });
}

export function baixarPdfVistoria(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
