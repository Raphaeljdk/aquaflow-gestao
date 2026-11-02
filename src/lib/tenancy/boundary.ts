/**
 * Limite de isolamento entre estabelecimentos.
 *
 * IMPORTANTE: este módulo é uma base para a futura migração multiempresa.
 * Ainda não substitui as rotas legadas de uma única empresa. Nunca passe um
 * "tenant" montado a partir de headers, cookies, query strings ou JSON do cliente.
 * A fonte deve ser o banco CENTRAL da plataforma, após autenticação.
 */
export type TenantRole = "PROPRIETARIO" | "GERENTE" | "CAIXA" | "FUNCIONARIO";
export type ProvisioningStatus = "PENDENTE" | "PROVISIONANDO" | "MIGRANDO" | "PRONTO" | "FALHA";
export type LicenseStatus = "PENDENTE" | "ATIVA" | "SUSPENSA" | "CANCELADA";

export type PlatformTenant = Readonly<{
  id: string;
  slug: string;
  provisioning: ProvisioningStatus;
  license: LicenseStatus;
  // O projeto Neon é exclusivo da empresa; nunca reutilizar o ID para outro tenant.
  neonProjectId: string | null;
  // Apenas referência no gerenciador de segredos, nunca uma DATABASE_URL em claro.
  databaseSecretRef: string | null;
}>;

export type VerifiedMember = Readonly<{
  userId: string;
  tenantId: string;
  role: TenantRole;
  active: boolean;
}>;

const verifiedAccessSeal: unique symbol = Symbol("VerifiedTenantAccess");

export type TenantAccess = Readonly<{
  readonly [verifiedAccessSeal]: true;
  tenantId: string;
  slug: string;
  userId: string;
  role: TenantRole;
  neonProjectId: string;
  databaseSecretRef: string;
}>;

export class TenantBoundaryError extends Error {
  constructor(message: string, public readonly status: 400 | 401 | 403 | 404 | 423 | 503) {
    super(message);
    this.name = "TenantBoundaryError";
  }
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function normalizeTenantSlug(candidate: string): string {
  const slug = candidate.trim().toLowerCase();
  if (slug.length < 3 || slug.length > 60 || !SLUG.test(slug)) {
    throw new TenantBoundaryError("Endereço do estabelecimento inválido.", 400);
  }
  return slug;
}

/**
 * Usuário e vínculo devem vir do servidor central autenticado, NÃO do JWT
 * desacompanhado de revalidação, e nunca de parâmetros enviados pelo cliente.
 * O operador da plataforma não possui acesso automático aos bancos dos clientes.
 */
export function authorizeTenantAccess(
  authenticatedUserId: string | null,
  tenant: PlatformTenant | null,
  membership: VerifiedMember | null,
  allowedRoles?: readonly TenantRole[],
): TenantAccess {
  if (!authenticatedUserId) throw new TenantBoundaryError("Entre para continuar.", 401);
  if (!tenant) throw new TenantBoundaryError("Estabelecimento não encontrado.", 404);
  if (!membership ||
      !membership.active ||
      membership.userId !== authenticatedUserId ||
      membership.tenantId !== tenant.id) {
    throw new TenantBoundaryError("Sem acesso a este estabelecimento.", 403);
  }
  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new TenantBoundaryError("Seu perfil não permite esta operação.", 403);
  }
  if (tenant.license !== "ATIVA") {
    throw new TenantBoundaryError("Acesso da empresa indisponível. Contate a administração.", 423);
  }
  if (tenant.provisioning !== "PRONTO" || !tenant.neonProjectId || !tenant.databaseSecretRef) {
    throw new TenantBoundaryError("Banco do estabelecimento ainda não está disponível.", 503);
  }
  return Object.freeze({
    [verifiedAccessSeal]: true as const,
    tenantId: tenant.id,
    slug: tenant.slug,
    userId: authenticatedUserId,
    role: membership.role,
    neonProjectId: tenant.neonProjectId,
    databaseSecretRef: tenant.databaseSecretRef,
  });
}

/** Validação também em runtime; um objeto criado de JSON não é TenantAccess. */
export function isVerifiedTenantAccess(value: unknown): value is TenantAccess {
  return typeof value === "object" && value !== null &&
    Reflect.get(value, verifiedAccessSeal) === true;
}

export type TenantControlPlane = {
  // São implementações server-side que consultam o REGISTRO CENTRAL.
  findBySlug: (slug: string) => Promise<PlatformTenant | null>;
  findMembership: (tenantId: string, userId: string) => Promise<VerifiedMember | null>;
};

/** Nunca tenta "fallback" para o DATABASE_URL global em caso de falha. */
export async function resolveTenantAccess(
  userId: string | null,
  candidateSlug: string,
  control: TenantControlPlane,
  allowedRoles?: readonly TenantRole[],
): Promise<TenantAccess> {
  if (!userId) throw new TenantBoundaryError("Entre para continuar.", 401);
  const slug = normalizeTenantSlug(candidateSlug);
  const tenant = await control.findBySlug(slug);
  const member = tenant ? await control.findMembership(tenant.id, userId) : null;
  return authorizeTenantAccess(userId, tenant, member, allowedRoles);
}
