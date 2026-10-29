import type { Vistoria } from "@/types";

const itens: Record<string, string> = {
  PARACHOQUES: "Para-choques", FAROIS: "Faróis e lanternas",
  PINTURA: "Pintura e riscos", RETROVISORES: "Retrovisores",
  VIDROS: "Vidros", AMASSADOS: "Lataria e amassados",
  RODAS_PNEUS: "Rodas e pneus", INTERIOR: "Interior e objetos",
};

/** Gera o documento no aparelho do atendente. Não publica dados pessoais nem expõe uma URL. */
export async function gerarPdfVistoria(info: {
  numero: number;
  estabelecimento: string;
  cliente: string;
  telefone: string;
  veiculo: string;
  placa: string;
  criadoEm: string;
  vistoria: Vistoria;
}): Promise<File> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 18;
  const pageBottom = 275;
  function write(text: string, bold = false, size = 10) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text || "Não informado", 175) as string[];
    for (const line of lines) {
      if (y > pageBottom) { doc.addPage(); y = 18; }
      doc.text(line, 18, y);
      y += size < 10 ? 5 : 6;
    }
  }
  write(info.estabelecimento || "Lava-rápido", true, 16);
  write("VISTORIA DE ENTRADA - COMANDA #" + info.numero, true, 12);
  y += 3;
  write("Cliente: " + info.cliente);
  write("Contato: " + info.telefone);
  write("Veículo: " + info.veiculo);
  write("Placa: " + info.placa);
  write("Abertura: " + new Date(info.criadoEm).toLocaleString("pt-BR"));
  write("Vistoria atualizada: " + new Date(info.vistoria.atualizadoEm).toLocaleString("pt-BR"));
  y += 5;
  write("CHECKLIST VISUAL", true, 12);
  for (const item of info.vistoria.itens) {
    const estado = !item.revisado ? "PENDENTE" : item.defeito ? "AVARIA REGISTRADA" : "SEM AVARIA APARENTE";
    write((itens[item.id] ?? item.id) + ": " + estado, true, 10);
    if (item.observacao.trim()) write("Observação: " + item.observacao.trim(), false, 9);
    y += 2;
  }
  y += 3;
  write("OBSERVAÇÕES GERAIS", true, 11);
  write(info.vistoria.observacoesGerais.trim() || "Nenhuma observação registrada.");
  y += 6;
  write("Registro visual de entrada realizado pelo estabelecimento. Não substitui laudo técnico.", false, 9);
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
