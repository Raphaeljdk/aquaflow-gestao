import type { Role, Entity } from "@/types";
export const canManage = (role: Role) => role === "ADMIN" || role === "GERENTE";
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
  GERENTE: [
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
  ATENDENTE: [
    "dashboard",
    "clientes",
    "veiculos",
    "servicos",
    "comandas",
    "agendamentos",
    "materiais",
    "movimentosEstoque",
    "estoque",
  ],
  LAVADOR: ["dashboard", "comandas"],
};
export function canWrite(role: Role, entity: Entity) {
  if (role === "ADMIN") return true;
  if (role === "LAVADOR") return entity === "comandas";
  if (["servicos", "funcionarios", "configuracoes"].includes(entity))
    return role === "GERENTE";
  if (entity === "materiais") return role === "GERENTE";
  return true;
}
