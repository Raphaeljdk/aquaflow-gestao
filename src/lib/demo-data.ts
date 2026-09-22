import type { AppData, Comanda } from "@/types";
import { dayKey, fromLocal } from "./format";
export function makeDemoData(now = new Date()): AppData {
  const today = dayKey(now),
    at = (h: string) => fromLocal(today + "T" + h);
  const clients = [
    ["Mariana Costa", "11988443210", "mariana@example.com"],
    ["Pedro Almeida", "11976122345", "pedro@example.com"],
    ["Ana Beatriz", "11999876543", "ana@example.com"],
    ["Lucas Ferreira", "11945678901", "lucas@example.com"],
    ["Camila Santos", "11977665432", "camila@example.com"],
    ["Rafael Lima", "11987651234", "rafael@example.com"],
    ["Juliana Rocha", "11976544321", "juliana@example.com"],
    ["Bruno Oliveira", "11965433210", "bruno@example.com"],
  ];
  const cars = [
    ["ABC1D23", "Jeep", "Compass", "Branco", "CAMINHONETE"],
    ["DEF4G56", "Volkswagen", "Polo", "Prata", "CARRO"],
    ["GHI7J89", "Honda", "Civic", "Preto", "CARRO"],
    ["JKL0M12", "Toyota", "Corolla", "Cinza", "CARRO"],
    ["NOP3Q45", "Hyundai", "HB20", "Azul", "CARRO"],
    ["RST6U78", "Honda", "CG 160", "Vermelho", "MOTO"],
    ["VWX9Y01", "Fiat", "Fastback", "Branco", "CAMINHONETE"],
    ["ZAB2C34", "Chevrolet", "Onix", "Preto", "CARRO"],
  ];
  const servicos = [
    {
      id: "s1",
      nome: "Lavagem completa",
      descricao: "Exterior, aspiração, painel e acabamento.",
      preco: 85,
      duracaoMin: 60,
      ativo: true,
    },
    {
      id: "s2",
      nome: "Lavagem simples",
      descricao: "Lavagem externa e secagem cuidadosa.",
      preco: 45,
      duracaoMin: 30,
      ativo: true,
    },
    {
      id: "s3",
      nome: "Enceramento",
      descricao: "Proteção e brilho para a pintura.",
      preco: 120,
      duracaoMin: 60,
      ativo: true,
    },
    {
      id: "s4",
      nome: "Higienização interna",
      descricao: "Limpeza profunda de bancos e interior.",
      preco: 250,
      duracaoMin: 120,
      ativo: true,
    },
    {
      id: "s5",
      nome: "Polimento",
      descricao: "Correção de imperfeições da pintura.",
      preco: 350,
      duracaoMin: 180,
      ativo: true,
    },
    {
      id: "s6",
      nome: "Lavagem de motor",
      descricao: "Limpeza técnica do compartimento do motor.",
      preco: 100,
      duracaoMin: 60,
      ativo: true,
    },
    {
      id: "s7",
      nome: "Cristalização",
      descricao: "Proteção duradoura com acabamento especial.",
      preco: 400,
      duracaoMin: 180,
      ativo: true,
    },
  ];
  const data: AppData = {
    clientes: clients.map((c, i) => ({
      id: "c" + (i + 1),
      nome: c[0],
      telefone: c[1],
      email: c[2],
      cpfCnpj: "",
      endereco: "São Paulo, SP",
      createdAt: at("08:00"),
    })),
    veiculos: cars.map((v, i) => ({
      id: "v" + (i + 1),
      clienteId: "c" + (i + 1),
      placa: v[0],
      marca: v[1],
      modelo: v[2],
      cor: v[3],
      ano: 2024,
      tipo: v[4] as "CARRO",
    })),
    servicos,
    funcionarios: [
      {
        id: "f1",
        nome: "Diego Martins",
        cargo: "LAVADOR",
        email: "diego@example.com",
        comissao: 15,
        ativo: true,
      },
      {
        id: "f2",
        nome: "André Silva",
        cargo: "LAVADOR",
        email: "andre@example.com",
        comissao: 12,
        ativo: true,
      },
      {
        id: "f3",
        nome: "Beatriz Souza",
        cargo: "ATENDENTE",
        email: "beatriz@example.com",
        comissao: 0,
        ativo: true,
      },
      {
        id: "f4",
        nome: "Carlos Mendes",
        cargo: "GERENTE",
        email: "carlos@example.com",
        comissao: 0,
        ativo: true,
      },
    ],
    comandas: [],
    agendamentos: [],
    configuracao: {
      nome: "AquaFlow Lava Rápido",
      cnpj: "",
      endereco: "Rua dos Pinheiros, 870 · São Paulo, SP",
      telefone: "(11) 3091-2020",
      logo: "",
      abertura: "08:00",
      fechamento: "18:00",
      intervaloMin: 30,
      diasSemana: [1, 2, 3, 4, 5, 6],
      timezone: "America/Sao_Paulo",
    },
  };
  let number = 1001;
  const add = (
    client: number,
    service: number,
    status: Comanda["status"],
    date: string,
    discount = 0,
  ) => {
    const s = servicos[service],
      fid = client % 2 ? "f1" : "f2",
      pct = fid === "f1" ? 15 : 12,
      total = s.preco - discount;
    data.comandas.push({
      id: "o" + number,
      numero: number++,
      clienteId: "c" + client,
      veiculoId: "v" + client,
      status,
      total,
      desconto: discount,
      formaPagamento: ["FINALIZADO", "ENTREGUE"].includes(status)
        ? (["PIX", "CREDITO", "DEBITO", "DINHEIRO"] as const)[number % 4]
        : null,
      observacoes: client === 1 ? "Atenção ao acabamento das rodas." : "",
      funcionarioId: fid,
      comissao: ["FINALIZADO", "ENTREGUE"].includes(status)
        ? Math.round(total * pct) / 100
        : 0,
      comissaoPercentual: pct,
      createdAt: date,
      finalizadoEm: ["FINALIZADO", "ENTREGUE"].includes(status)
        ? new Date(new Date(date).getTime() + 3600000).toISOString()
        : null,
      itens: [{ servicoId: s.id, nome: s.nome, preco: s.preco, quantidade: 1 }],
    });
  };
  for (let d = 29; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const key = dayKey(date);
    for (let j = 0; j < (d === 0 ? 18 : 9 + (d % 7)); j++) {
      add(
        (j % 8) + 1,
        j % 8 === 0 ? 3 : j % 4 === 0 ? 2 : j % 3 === 0 ? 1 : 0,
        "ENTREGUE",
        fromLocal(
          key +
            "T" +
            String(8 + Math.floor(j / 3)).padStart(2, "0") +
            ":" +
            String((j % 3) * 20).padStart(2, "0"),
        ),
      );
    }
  }
  add(1, 0, "EM_LAVAGEM", at("09:15"));
  add(2, 1, "EM_LAVAGEM", at("09:30"));
  add(3, 3, "AGUARDANDO", at("09:45"));
  add(4, 0, "AGUARDANDO", at("10:00"));
  add(5, 2, "FINALIZADO", at("08:15"));
  data.agendamentos = [
    {
      id: "a1",
      clienteId: "c7",
      veiculoId: "v7",
      dataHora: at("13:00"),
      fim: at("14:00"),
      servicoIds: ["s1"],
      status: "AGENDADO",
      observacoes: "",
      comandaId: null,
    },
    {
      id: "a2",
      clienteId: "c8",
      veiculoId: "v8",
      dataHora: at("14:00"),
      fim: at("15:00"),
      servicoIds: ["s3"],
      status: "AGENDADO",
      observacoes: "",
      comandaId: null,
    },
    {
      id: "a3",
      clienteId: "c6",
      veiculoId: "v6",
      dataHora: at("15:00"),
      fim: at("15:30"),
      servicoIds: ["s2"],
      status: "AGENDADO",
      observacoes: "",
      comandaId: null,
    },
  ];
  return data;
}
