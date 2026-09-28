import type { Role, Entity } from "@/types";

export const canManage = (role: Role) => role === "ADMIN";

const employeePages = ["clientes", "veiculos", "comandas", "agendamentos"];

export const allowedPages: Record<Role, string[]> = {
  ADMIN: [
    "dashboard",
    "clientes",
    "veiculos",
    "servicos",
    "comandas",
    "agendamentos",
    "funcionarios",
    "relatorios",
    "configuracoes",
    "materiais",
    "movimentosEstoque",
    "estoque",
  ],
  FUNCIONARIO: employeePages,
  GERENTE: employeePages,
  ATENDENTE: employeePages,
  LAVADOR: employeePages,
};

export function canWrite(role: Role, entity: Entity) {
  if (role === "ADMIN") return true;
  return ["clientes", "veiculos", "comandas", "agendamentos"].includes(entity);
}
