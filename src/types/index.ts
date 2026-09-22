export const roles = ["ADMIN", "GERENTE", "ATENDENTE", "LAVADOR"] as const;
export type Role = (typeof roles)[number];
export type Status =
  "AGUARDANDO" | "EM_LAVAGEM" | "FINALIZADO" | "ENTREGUE" | "CANCELADO";
export type Payment = "DINHEIRO" | "PIX" | "DEBITO" | "CREDITO";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  funcionarioId?: string | null;
}
export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  cpfCnpj: string;
  endereco: string;
  createdAt: string;
}
export interface Veiculo {
  id: string;
  clienteId: string;
  placa: string;
  marca: string;
  modelo: string;
  cor: string;
  ano: number;
  tipo: "CARRO" | "MOTO" | "CAMINHONETE";
}
export interface Servico {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  duracaoMin: number;
  ativo: boolean;
}
export interface Funcionario {
  id: string;
  nome: string;
  cargo: Role;
  comissao: number;
  email: string;
  ativo: boolean;
}
export interface ItemComanda {
  servicoId: string;
  nome: string;
  preco: number;
  quantidade: number;
}
export interface Comanda {
  id: string;
  numero: number;
  clienteId: string;
  veiculoId: string;
  status: Status;
  total: number;
  desconto: number;
  formaPagamento: Payment | null;
  observacoes: string;
  funcionarioId: string | null;
  comissao: number;
  comissaoPercentual: number;
  createdAt: string;
  finalizadoEm: string | null;
  itens: ItemComanda[];
}
export interface Agendamento {
  id: string;
  clienteId: string;
  veiculoId: string;
  dataHora: string;
  fim: string;
  servicoIds: string[];
  status: "AGENDADO" | "CONVERTIDO" | "CANCELADO";
  observacoes: string;
  comandaId: string | null;
}
export interface Configuracao {
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  logo: string;
  abertura: string;
  fechamento: string;
  intervaloMin: number;
  diasSemana: number[];
  timezone: string;
}
export interface AppData {
  clientes: Cliente[];
  veiculos: Veiculo[];
  servicos: Servico[];
  funcionarios: Funcionario[];
  comandas: Comanda[];
  agendamentos: Agendamento[];
  configuracao: Configuracao;
}
export type Entity =
  | "clientes"
  | "veiculos"
  | "servicos"
  | "funcionarios"
  | "comandas"
  | "agendamentos"
  | "configuracoes";
export interface Mutation {
  entity: Entity;
  method: "POST" | "PATCH" | "DELETE";
  id?: string;
  data?: Record<string, unknown>;
}
export const statusLabels: Record<Status, string> = {
  AGUARDANDO: "Aguardando",
  EM_LAVAGEM: "Em lavagem",
  FINALIZADO: "Pronto para retirada",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};
export const paymentLabels: Record<Payment, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  DEBITO: "Débito",
  CREDITO: "Crédito",
};
export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  ATENDENTE: "Atendente",
  LAVADOR: "Lavador",
};
