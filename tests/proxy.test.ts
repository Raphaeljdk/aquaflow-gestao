import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { proxy } from "../src/proxy";
import type { Role } from "../src/types";

test("URLs diretas exigem sessão e respeitam a hierarquia", async () => {
  const original = { secret: process.env.NEXTAUTH_SECRET, url: process.env.NEXTAUTH_URL, demo: process.env.NEXT_PUBLIC_DEMO };
  const secret = "segredo-exclusivo-de-teste-sem-validade-em-producao";
  process.env.NEXTAUTH_SECRET = secret;
  process.env.NEXTAUTH_URL = "https://app.test";
  process.env.NEXT_PUBLIC_DEMO = "false";
  const request = async (path: string, role?: string) => {
    // Inclui deliberadamente um perfil inválido para testar a rejeição em runtime.
    const token = role ? await encode({ secret, token: { sub: "test-user", role: role as Role } }) : "";
    return proxy(new NextRequest("https://app.test" + path, { headers: token ? { cookie: `__Secure-next-auth.session-token=${token}` } : {} }));
  };
  try {
    const anonymous = await request("/comandas");
    assert.equal(new URL(anonymous.headers.get("location")!).pathname, "/login");
    for (const path of ["/clientes", "/comandas", "/agendamentos"])
      assert.equal((await request(path, "FUNCIONARIO")).headers.get("x-middleware-next"), "1", path);
    for (const path of ["/dashboard", "/relatorios", "/estoque", "/funcionarios", "/configuracoes", "/veiculos"])
      assert.equal(new URL((await request(path, "FUNCIONARIO")).headers.get("location")!).pathname, "/clientes", path);
    assert.equal((await request("/configuracoes", "ADMIN")).headers.get("x-middleware-next"), "1");
    assert.equal(new URL((await request("/clientes", "ROOT")).headers.get("location")!).pathname, "/login");
  } finally {
    for (const [key, value] of Object.entries({ NEXTAUTH_SECRET: original.secret, NEXTAUTH_URL: original.url, NEXT_PUBLIC_DEMO: original.demo })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
