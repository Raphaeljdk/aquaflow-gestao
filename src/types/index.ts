export const roles = ["ADMIN", "FUNCIONARIO", "GERENTE", "ATENDENTE", "LAVADOR"] as const;
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
  acesso?: { ativo: boolean; email: string; role: Role } | null;
}
export interface ItemComanda {
  servicoId: string;
  nome: string;
  preco: number;
  quantidade: number;
}
export type VistoriaItemId =
  | "PINTURA"
  | "AMASSADOS"
  | "VIDROS"
  | "FAROIS"
  | "RODAS_PNEUS"
  | "RETROVISORES"
  | "PARACHOQUES"
  | "INTERIOR";
export interface ItemVistoria {
  id: VistoriaItemId;
  revisado: boolean;
  defeito: boolean;
  observacao: string;
}
export interface Vistoria {
  itens: ItemVistoria[];
  observacoesGerais: string;
  atualizadoEm: string;
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
  vistoria: Vistoria | null;
  funcionarioId: string | null;
  comissao: number;
  comissaoPercentual: number;
  createdAt: string;
  finalizadoEm: string | null;
  pagoEm: string | null;
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
  pixChave: string;
  logo: string;
  abertura: string;
  fechamento: string;
  intervaloMin: number;
  diasSemana: number[];
  timezone: string;
}
export interface Material {
  id: string;
  nome: string;
  unidade: "un" | "L" | "ml" | "kg" | "g";
  quantidade: number;
  minimo: number;
  custoUnitario: number;
  ativo: boolean;
}
export interface MovimentoEstoque {
  id: string;
  materialId: string;
  tipo: "ENTRADA" | "SAIDA";
  quantidade: number;
  observacao: string;
  createdAt: string;
}
export interface AppData {
  clientes: Cliente[];
  veiculos: Veiculo[];
  servicos: Servico[];
  funcionarios: Funcionario[];
  comandas: Comanda[];
  agendamentos: Agendamento[];
  materiais: Material[];
  movimentosEstoque: MovimentoEstoque[];
  configuracao: Configuracao;
}
export type Entity =
  | "clientes"
  | "veiculos"
  | "servicos"
  | "funcionarios"
  | "comandas"
  | "agendamentos"
  | "materiais"
  | "movimentosEstoque"
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
  CREDITO: "Cartão",
};
export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  FUNCIONARIO: "Funcionário",
  GERENTE: "Funcionário",
  ATENDENTE: "Funcionário",
  LAVADOR: "Funcionário",
};
