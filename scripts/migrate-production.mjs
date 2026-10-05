import { spawnSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log("[migrate] Ambiente não produtivo: migrations não executadas.");
  process.exit(0);
}

if (!process.env.DATABASE_URL && !process.env.POSTGRES_PRISMA_URL && !process.env.POSTGRES_URL && !process.env.NEON_DATABASE_URL) {
  console.error("[migrate] Banco de produção não configurado.");
  process.exit(1);
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

console.log("[migrate] Migrations de produção aplicadas com sucesso.");
