import { jsPDF } from "jspdf";

export const dynamic = "force-dynamic";

// Manual padrão do ERP: PDF criado no servidor, sem arquivos externos nem dados de clientes.
export async function GET() {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const width = 210, margin = 20, contentWidth = 170;
  let y = 0;
  let page = 0;
  const ink = [25, 28, 33] as const;
  const muted = [89, 94, 104] as const;
  const yellow = [255, 211, 33] as const;

  function pageStart() {
    if (page > 0) doc.addPage();
    page++;
    y = 30;
    doc.setFillColor(18, 20, 24);
    doc.rect(0, 0, width, 15, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...yellow);
    doc.setFontSize(10);
    doc.text("DUCHA ELITTE  /  MANUAL OPERACIONAL", margin, 9.5);
    doc.setDrawColor(220, 223, 226);
    doc.line(margin, 283, width - margin, 283);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...muted);
    doc.setFontSize(8);
    doc.text("Ducha Elitte  •  Manual de treinamento", margin, 288);
    doc.text("Página " + page, width-margin, 288, { align: "right" });
  }

  function ensure(linesHeight: number) {
    if (y + linesHeight > 273) pageStart();
  }

  function title(text: string) {
    ensure(20);
    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...ink);
    doc.text(text, margin, y); y += 12;
  }

  function sub(text: string) {
    ensure(17);
    y += 3;
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...ink);
    doc.text(text, margin, y); y += 8;
  }

  function para(text: string) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...ink);
    const lines = doc.splitTextToSize(text, contentWidth);
    const height = lines.length * 5.8 + 3;
    ensure(height);
    doc.text(lines, margin, y, { lineHeightFactor: 1.3 });
    y += height;
  }

  function item(text: string) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, contentWidth - 7);
    const height = lines.length * 5.8 + 3;
    ensure(height);
    doc.setFillColor(225, 177, 0); doc.circle(margin + 1.5, y - 1.1, 1, "F");
    doc.setTextColor(...ink); doc.text(lines, margin + 6, y, { lineHeightFactor: 1.3 });
    y += height;
  }

  function section(heading: string, intro: string, lines: string[]) {
    sub(heading); if (intro) para(intro); for (const line of lines) item(line);
  }

  pageStart();
  y = 49;
  doc.setFillColor(...yellow); doc.roundedRect(margin, 27, 44, 9, 4, 4, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...ink);
  doc.text("GUIA OFICIAL", margin+6, 33);
  y = 62;
  doc.setFontSize(26); doc.text("DUCHA ELITTE", margin, y); y += 12;
  doc.setFontSize(17); doc.text("Manual do ERP de lava-rápidos", margin, y); y += 16;
  para("Do primeiro atendimento ao fechamento de uma comanda: veja como usar cada aba do sistema, organizar horários, registrar vistorias, consultar faturamento e administrar a equipe.");
  y += 10;
  section("Antes de começar", "O Ducha Elitte é um ERP de gestão operacional de lava-rápidos. O acesso disponível depende do perfil do usuário.", [
    "Administrador: administra serviços, equipe, materiais, relatórios e configurações.",
    "Funcionário: opera os atendimentos permitidos, como clientes, comandas e agendamentos.",
    "Os pedidos públicos são solicitações e só viram reservas após confirmação da equipe.",
    "A marca interna do estabelecimento é independente da marca institucional do login.",
  ]);

  pageStart();
  title("01  Visão geral e clientes");
  section("Visão geral", "Use o painel para entender o movimento do dia.", [
    "Veja indicadores, atividades recentes e um resumo dos atendimentos registrados.",
    "Confira se as comandas foram concluídas antes de interpretar o faturamento.",
  ]);
  section("Clientes", "A consulta de histórico agiliza os próximos atendimentos.", [
    "Pesquise pelo nome e, quando disponível, pelo veículo ou placa.",
    "Na recepção rápida, informe os dados essenciais do cliente e do veículo.",
    "Consulte o histórico antes de criar cadastros duplicados.",
  ]);
  sub("Fluxo básico da lavagem");
  for (const line of ["1. Receber veículo.", "2. Abrir comanda.", "3. Fazer vistoria de entrada.", "4. Realizar a lavagem.", "5. Conferir e registrar o pagamento."]) item(line);

  pageStart();
  title("02  Comandas e vistoria");
  section("Abrir uma nova comanda", "", [
    "Abra Comandas e toque em Receber veículo ou Nova comanda.",
    "Selecione Cliente novo ou Buscar cliente anterior.",
    "Escolha carro, moto ou caminhonete, informe o veículo e os serviços.",
    "Confira funcionário responsável, descontos e observações.",
    "Abra a comanda e revise o resumo antes de iniciar o serviço.",
  ]);
  section("Vistoria de entrada", "", [
    "Selecione cada ponto no desenho do veículo.",
    "Marque Sem avaria ou Com avaria conforme a inspeção.",
    "Descreva riscos, amassados ou outros danos já existentes.",
    "Complete todos os pontos e clique em Salvar vistoria.",
    "O mapa reconhece carro e moto; a vistoria pertence à comanda correspondente.",
  ]);
  section("Finalização", "", [
    "Conclua o serviço, confira o total e registre a forma de pagamento.",
    "Não considere Pix estático como pago sem conferir o crédito no banco.",
  ]);

  pageStart();
  title("03  Agendamentos");
  section("Agenda interna", "", [
    "Abra Agendamentos, escolha o dia e verifique os horários livres.",
    "Ao registrar um agendamento, confira serviço e duração.",
    "O sistema considera horário de abertura, fechamento e dias de trabalho.",
  ]);
  section("Link de agendamento do lava-rápido", "", [
    "Compartilhe a página pública do estabelecimento com seus clientes.",
    "O visitante informa nome, contato, placa, tipo de veículo, serviço e horário.",
    "A solicitação chega como PENDENTE ao painel de Agendamentos.",
    "A equipe verifica e confirma ou recusa o pedido; a reserva não é automática.",
    "Depois da decisão, avise o cliente pelo WhatsApp.",
  ]);
  section("Horário de funcionamento", "", [
    "Em Configurações > Funcionamento, defina dias abertos, hora de abertura, fechamento e intervalos.",
    "Salve as alterações e teste pelo link de agendamento.",
  ]);

  pageStart();
  title("04  Estoque, serviços e equipe");
  section("Estoque", "", [
    "Consulte a lista de materiais e o saldo disponível.",
    "Registre entradas e saídas para manter os dados atualizados.",
    "Confira estoque baixo e o consumo antes de compras.",
  ]);
  section("Serviços", "", [
    "Cadastre o nome, o valor e a duração das lavagens.",
    "Crie serviços para carro e moto quando preços e procedimentos forem diferentes.",
    "A duração impacta a disponibilidade dos agendamentos.",
  ]);
  section("Funcionários", "", [
    "No menu Funcionários, o administrador mantém a equipe e os acessos.",
    "Use login individual; não compartilhe senhas administrativas.",
    "Os funcionários não precisam de acesso ao financeiro ou a toda a gestão.",
  ]);

  pageStart();
  title("05  Faturamento e configurações");
  section("Faturamento", "", [
    "Confira os totais obtidos a partir dos atendimentos e recebimentos registrados.",
    "Revise comandas fechadas, descontos e meios de pagamento.",
    "Valide recebimentos externos diretamente no banco quando necessário.",
  ]);
  section("Configurações > Empresa", "", [
    "Altere nome do estabelecimento, CNPJ, endereço e WhatsApp.",
    "A busca por CNPJ sugere dados públicos, mas você deve conferi-los.",
    "Envie uma logo para o painel do seu lava-rápido: o login institucional não muda.",
  ]);
  section("Configurações > Funcionamento", "", [
    "Defina os dias e horários de abertura e fechamento.",
    "Ajuste o intervalo entre horários de agendamento.",
  ]);
  section("Configurações > Como usar", "", [
    "Informe um link HTTPS para vídeo explicativo, quando houver.",
    "O sistema inclui este manual PDF por padrão.",
    "É possível cadastrar um link de PDF personalizado para substituir o padrão.",
  ]);

  pageStart();
  title("06  Como usar e plataforma");
  section("Como usar", "", [
    "Abra Como usar no menu lateral para ver a explicação de cada aba.",
    "Assista ao vídeo explicativo, quando configurado.",
    "Abra o manual PDF para consultar o passo a passo e resolver dúvidas.",
  ]);
  section("Gestão da plataforma", "", [
    "A plataforma recebe solicitações comerciais de outros lava-rápidos.",
    "O gestor valida parceiros antes de disponibilizá-los publicamente.",
    "Não misture informações de estabelecimentos diferentes.",
  ]);
  section("Se algo não funcionar", "", [
    "Se uma aba sumir, atualize o navegador sem usar o cache e confira a versão publicada.",
    "Se os agendamentos não aparecerem, verifique data, serviço, expediente e fila de pendentes.",
    "Se o vídeo não abrir, confira o link cadastrado pelo administrador.",
    "Se o botão PDF não abrir, confirme que a aplicação está online.",
    "Para reportar falhas, envie nome da tela, dispositivo e o que aconteceu. Nunca envie senhas.",
  ]);
  doc.setProperties({ title: "Manual Ducha Elitte ERP", author: "Freitas Corp", subject: "Guia de treinamento do lava-rápido" });
  return new Response(doc.output("blob"), {
    status: 200,
    headers: { "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="Manual_Ducha_Elitte_ERP.pdf"',
      "Cache-Control": "public, max-age=3600" },
  });
}
