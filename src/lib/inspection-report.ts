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
  resumoComanda?: {
    status: string;
    pagamento: string;
    desconto: number;
    total: number;
    observacoes: string;
    finalizadoEm?: string | null;
    pagoEm?: string | null;
    servicos: Array<{ nome: string; preco: number; quantidade: number }>;
    produtos: Array<{ nome: string; preco: number; quantidade: number; devolvido?: number }>;
  };
}): Promise<File> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  // Emissão completa: resumo comercial vem ANTES do mapa de vistoria.
  // A versão antiga de vistoria avulsa não sofre alterações.
  if (info.resumoComanda) {
    const resumo = info.resumoComanda;
    const currency = (valor: number) => "R$ " + valor.toFixed(2).replace(".", ",");
    let rowY = 46;
    doc.setFillColor(17, 24, 32);
    doc.rect(0, 0, 210, 35, "F");
    doc.setFillColor(245, 188, 46);
    doc.rect(0, 0, 210, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text((info.estabelecimento || "Lava-rápido").slice(0, 53), 17, 17);
    doc.setFontSize(10.5);
    doc.text("COMANDA COMPLETA #" + info.numero, 17, 26);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(36, 44, 54);
    doc.setFontSize(9);
    const titleLine = [
      "Cliente: " + info.cliente,
      "Contato: " + info.telefone,
      "Veículo: " + info.veiculo + " | " + info.placa,
      "Aberta: " + new Date(info.criadoEm).toLocaleString("pt-BR"),
      "Situação: " + resumo.status,
      "Pagamento: " + resumo.pagamento,
    ];
    for (const line of titleLine) {
      for (const fragment of doc.splitTextToSize(line, 175) as string[]) {
        if (rowY > 268) { doc.addPage(); rowY = 25; }
        doc.text(fragment, 17, rowY); rowY += 6;
      }
    }
    const section = (name: string) => {
      if (rowY > 257) { doc.addPage(); rowY = 22; }
      rowY += 6;
      doc.setFillColor(240, 243, 246);
      doc.roundedRect(17, rowY - 5, 176, 9, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.setTextColor(23, 33, 43); doc.text(name, 21, rowY + 1);
      rowY += 12;
    };
    const lineItem = (name: string, qty: number, price: number, note = "") => {
      if (rowY > 263) { doc.addPage(); rowY = 23; }
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.3);
      const desc = qty + "x " + name.slice(0, 75) + (note ? " " + note : "");
      const lines = doc.splitTextToSize(desc, 127) as string[];
      doc.text(lines, 19, rowY);
      doc.text(currency(qty * price), 191, rowY, { align: "right" });
      rowY += Math.max(1, lines.length) * 4.5 + 2;
    };
    section("SERVIÇOS CONTRATADOS");
    for (const item of resumo.servicos) lineItem(item.nome, item.quantidade, item.preco);
    if (!resumo.servicos.length) lineItem("Nenhum serviço", 0, 0);
    section("BEBIDAS, ALIMENTOS E PRODUTOS");
    for (const item of resumo.produtos) {
      lineItem(item.nome, item.quantidade, item.preco, item.devolvido ? "(devolvidos: " + item.devolvido + ")" : "");
    }
    if (!resumo.produtos.length) lineItem("Nenhum produto", 0, 0);
    section("FECHAMENTO");
    for (const line of [
      "Desconto registrado: " + currency(resumo.desconto),
      "TOTAL ATUAL DA COMANDA: " + currency(resumo.total),
      "Finalizada em: " + (resumo.finalizadoEm ? new Date(resumo.finalizadoEm).toLocaleString("pt-BR") : "Ainda não finalizada"),
      "Pagamento registrado em: " + (resumo.pagoEm ? new Date(resumo.pagoEm).toLocaleString("pt-BR") : "Ainda não registrado"),
    ]) {
      if (rowY > 263) { doc.addPage(); rowY = 23; }
      doc.setFont("helvetica", line.startsWith("TOTAL") ? "bold" : "normal");
      doc.setFontSize(line.startsWith("TOTAL") ? 11 : 8.5);
      doc.text(line.slice(0, 108), 19, rowY);
      rowY += 7;
    }
    const notes = (resumo.observacoes || "").trim();
    if (notes) {
      section("OBSERVAÇÕES DA COMANDA");
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      for (const line of doc.splitTextToSize(notes, 167) as string[]) {
        if (rowY > 268) { doc.addPage(); rowY = 23; }
        doc.text(line, 19, rowY); rowY += 5;
      }
    }
    doc.addPage();
  }

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
    // Anotações longas continuam nas páginas seguintes; nunca cortar avarias.
    if (lines.length > 16) {
      for (const line of lines.slice(16)) {
        if (y + 5 > 276) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.1);
        doc.setTextColor(82, 94, 107);
        doc.text(line, 101, y + 3);
        y += 4.2;
      }
      y += 3;
    }
  }

  y = Math.max(y + 7, doc.getNumberOfPages() === 1 ? 232 : 20);
  const obs = info.vistoria.observacoesGerais.trim() || "Nenhuma observação registrada.";
  const obsLines = doc.splitTextToSize(obs, 172) as string[];
  addPageIfNeeded(15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...ink);
  doc.text("OBSERVAÇÕES GERAIS", 17, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.4);
  y += 7;
  for (const line of obsLines) {
    if (y + 4.5 > 276) { doc.addPage(); y = 20; }
    doc.text(line, 17, y);
    y += 4.5;
  }

  // Fotos de apoio são páginas adicionais do mesmo PDF de vistoria/comanda.
  // Base64 previamente validado e limitado no servidor (até três imagens).
  if (info.vistoria.fotos?.length) {
    doc.addPage();
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("REGISTRO FOTOGRÁFICO DA VISTORIA", 17, 21);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Comanda #" + info.numero + " · Placa " + (info.placa || "não informada"), 17, 28);
    for (const [i, foto] of info.vistoria.fotos.entries()) {
      if (i > 0 && i % 2 === 0) {
        doc.addPage();
        doc.setTextColor(...ink);
      }
      const yFoto = i % 2 === 0 ? 39 : 153;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Foto " + (i + 1), 18, yFoto);
      try {
        const props = doc.getImageProperties(foto);
        const maxW = 170, maxH = 98;
        const factor = Math.min(maxW / props.width, maxH / props.height);
        const w = props.width * factor, h = props.height * factor;
        doc.addImage(foto, "JPEG", 18, yFoto + 4, w, h);
      } catch {
        doc.setFont("helvetica", "normal");
        doc.text("Imagem indisponível para visualização.", 18, yFoto + 10);
      }
    }
  }

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
  return new File([doc.output("blob")], (info.resumoComanda ? "comanda-completa-" : "vistoria-comanda-") + info.numero + ".pdf", { type: "application/pdf" });
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
