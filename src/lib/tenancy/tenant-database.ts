import { PrismaClient } from "@prisma/client";
import type { TenantAccess } from "./boundary";
import { TenantBoundaryError, isVerifiedTenantAccess } from "./boundary";

/**
 * Primeira versão isolada do resolvedor de conexões (ainda não ligado às rotas).
 * O acesso precisa ser validado por authorizeTenantAccess/resolveTenantAccess.
 * Nenhum segredo ou database URL vem do navegador ou da sessão do usuário.
 *
 * Na versão para 1000+ empresas, um pool gerenciado deve substituir a criação
 * por requisição; nunca colocar milhares de PrismaClients em um Map sem limites.
 */
export type TenantDbClient = {
  $disconnect: () => Promise<void>;
};

export type TenantDbProvider<Client extends TenantDbClient> = {
  /** Busca o segredo em um cofre privado server-side. */
  readConnectionSecret: (ref: string) => Promise<string>;
  /** Constrói a conexão apenas após resolver o tenant autorizado. */
  createClient: (url: string) => Client;
  /** A URL de produção legada, que NÃO pode ser usada para tenants novos. */
  legacyConnectionUrl?: string;
};

function inspectDatabaseUrl(raw: string): URL {
  try {
    const url = new URL(raw);
    if (!["postgresql:", "postgres:"].includes(url.protocol) ||
        !url.hostname || !url.pathname || url.pathname === "/" ||
        !url.username || !url.password) {
      throw new Error("incomplete");
    }
    return url;
  } catch {
    // Não inclua a URL ou credenciais na mensagem/log.
    throw new TenantBoundaryError("Configuração privada do banco inválida.", 503);
  }
}

/**
 * Não existe caminho de contingência para DATABASE_URL central.
 * O projeto Neon deve ser exclusivo do estabelecimento, e sua URL fica no cofre.
 */
export async function withTenantDatabase<Client extends TenantDbClient, Result>(
  authorized: TenantAccess,
  provider: TenantDbProvider<Client>,
  operation: (client: Client) => Promise<Result>,
): Promise<Result> {
  if (!isVerifiedTenantAccess(authorized) || !authorized.tenantId || !authorized.databaseSecretRef || !authorized.neonProjectId) {
    throw new TenantBoundaryError("Banco do estabelecimento não provisionado.", 503);
  }
  const url = inspectDatabaseUrl(await provider.readConnectionSecret(authorized.databaseSecretRef));
  const oldUrl = provider.legacyConnectionUrl ?? process.env.DATABASE_URL;
  if (oldUrl) {
    const legacy = inspectDatabaseUrl(oldUrl);
    // Projetos Neon dedicados possuem endpoints próprios. Proibimos reutilizar
    // o host do banco legado (mesmo que seja outro nome de database).
    if (url.hostname === legacy.hostname) {
      throw new TenantBoundaryError("Conexão não isolada do banco legado.", 503);
    }
  }
  const client = provider.createClient(url.toString());
  try {
    return await operation(client);
  } finally {
    await client.$disconnect();
  }
}

export async function withTenantPrisma<Result>(
  authorized: TenantAccess,
  secretReader: (ref: string) => Promise<string>,
  operation: (client: PrismaClient) => Promise<Result>,
): Promise<Result> {
  return withTenantDatabase(
    authorized,
    {
      readConnectionSecret: secretReader,
      createClient: (url) => new PrismaClient({
        datasources: { db: { url } },
        log: ["error"],
      }),
    },
    operation,
  );
}
