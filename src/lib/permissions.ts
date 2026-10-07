import { roles, type Role, type Entity } from "@/types";

export const canManage = (role: Role) => role === "ADMIN";

export function isRole(role: unknown): role is Role {
  return typeof role === "string" && roles.includes(role as Role);
}

// O funcionário enxerga somente estas três áreas.
// Veículos continuam graváveis porque são administrados dentro do cadastro do cliente.
const employeePages = ["clientes", "comandas", "agendamentos"];

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

export function canAccessPage(role: unknown, page: string) {
  return isRole(role) && allowedPages[role].includes(page);
}

// Rotas de dados são diferentes das páginas: veículos são mantidos em Clientes.
export function canAccessEntity(role: unknown, entity: Entity, method: string) {
  if (!isRole(role) || !["GET", "POST", "PATCH", "DELETE"].includes(method))
    return false;
  return role === "ADMIN" ||
    ["clientes", "veiculos", "comandas", "agendamentos"].includes(entity);
}

export function canWrite(role: Role, entity: Entity) {
  return canAccessEntity(role, entity, "POST");
}

export function homePath(role: unknown) {
  return role === "ADMIN" ? "/dashboard" : isRole(role) ? "/clientes" : "/login";
}

export function loginRedirectPath(role: unknown, callback: string | null) {
  if (callback?.startsWith("/") && !callback.startsWith("//") && !callback.includes("\\")) {
    const url = new URL(callback, "https://app.local");
    const page = url.pathname.split("/")[1] || "dashboard";
    if (url.origin === "https://app.local" && !url.pathname.startsWith("//") && canAccessPage(role, page))
      return url.pathname + url.search;
  }
  return homePath(role);
}
