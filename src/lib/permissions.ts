import type { Entity, Role, User } from "@/types";

// Áreas operacionais que o proprietário pode habilitar por colaborador.
// Configurações, cadastro de usuários e catálogo são exclusivos do dono.
export const employeeModules = [
  { id: "dashboard", label: "Visão geral" },
  { id: "clientes", label: "Histórico de clientes" },
  { id: "comandas", label: "Comandas e atendimento" },
  { id: "agendamentos", label: "Agendamentos" },
  { id: "estoque", label: "Consulta ao estoque" },
  { id: "relatorios", label: "Consulta ao faturamento" },
] as const;
export type EmployeeModule = (typeof employeeModules)[number]["id"];
const grantable = new Set<string>(employeeModules.map((module) => module.id));
const employeeDefaults: EmployeeModule[] = ["clientes", "comandas", "agendamentos"];

export const allowedPages: Record<Role, string[]> = {
  ADMIN: [
    "dashboard", "clientes", "veiculos", "servicos", "comandas",
    "agendamentos", "funcionarios", "relatorios", "configuracoes",
    "materiais", "movimentosEstoque", "estoque",
  ],
  FUNCIONARIO: employeeDefaults,
  GERENTE: employeeDefaults,
  ATENDENTE: employeeDefaults,
  LAVADOR: employeeDefaults,
};
export const canManage = (role: Role) => role === "ADMIN";

// Lista vazia: contas legadas mantêm o acesso padrão. Para personalização
// é obrigatório escolher ao menos um módulo.
export function pagesForUser(user: Pick<User, "role" | "permissoes">): string[] {
  if (user.role === "ADMIN") return allowedPages.ADMIN;
  if (user.permissoes?.length) {
    return [...new Set(user.permissoes)].filter((module) => grantable.has(module));
  }
  return employeeDefaults;
}
export function canRead(
  user: Pick<User, "role" | "permissoes">,
  entity: Entity,
): boolean {
  if (user.role === "ADMIN") return true;
  const pages = pagesForUser(user);
  if (entity === "comandas") return pages.includes("comandas");
  if (entity === "agendamentos") return pages.includes("agendamentos");
  if (entity === "clientes") return pages.includes("clientes");
  if (entity === "veiculos") return false;
  if (entity === "servicos") return pages.includes("comandas") || pages.includes("agendamentos");
  if (entity === "materiais" || entity === "movimentosEstoque") return pages.includes("estoque");
  return false;
}

export function canWrite(roleOrUser: Role | Pick<User, "role" | "permissoes">, entity: Entity) {
  const user = typeof roleOrUser === "string" ? { role: roleOrUser } : roleOrUser;
  if (user.role === "ADMIN") return true;
  return (entity === "comandas" || entity === "agendamentos") && pagesForUser(user).includes(entity);
}
