import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { snapshot, scopeData, mutate } from "@/lib/repository";
import { checkOrigin, apiError } from "@/lib/api";
import { allowedPages } from "@/lib/permissions";
import { BusinessError } from "@/lib/domain";
import type { Mutation } from "@/types";
const entitySchema = z.enum([
  "clientes",
  "veiculos",
  "servicos",
  "funcionarios",
  "comandas",
  "agendamentos",
  "configuracoes",
  "materiais",
  "movimentosEstoque",
]);
type Context = { params: Promise<{ entity: string; id?: string[] }> };
async function handler(request: Request, context: Context) {
  try {
    const user = await currentUser(),
      params = await context.params,
      entity = entitySchema.parse(params.entity),
      id = params.id?.[0];
    if (params.id && params.id.length > 1)
      throw new BusinessError("Rota inexistente.", 404);
    if (!allowedPages[user.role].includes(entity))
      throw new BusinessError("Sem permissão.", 403);
    if (request.method === "GET") {
      const d = scopeData(await snapshot(), user);
      const list = entity === "configuracoes" ? d.configuracao : d[entity];
      const result =
        id && Array.isArray(list) ? list.find((x) => x.id === id) : list;
      if (!result) throw new BusinessError("Registro não encontrado.", 404);
      return NextResponse.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    checkOrigin(request);
    if (Number(request.headers.get("content-length") ?? 0) > 600000)
      throw new BusinessError("Requisição muito grande.", 413);
    const text = await request.text();
    if (text.length > 600000)
      throw new BusinessError("Requisição muito grande.", 413);
    const data = text ? JSON.parse(text) : {};
    if (
      ["PATCH", "DELETE"].includes(request.method) &&
      !id &&
      entity !== "configuracoes"
    )
      throw new BusinessError("Informe o registro.");
    return NextResponse.json(
      await mutate(
        { entity, id, method: request.method as Mutation["method"], data },
        user,
      ),
      { status: request.method === "POST" ? 201 : 200 },
    );
  } catch (e) {
    if (e instanceof SyntaxError)
      return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    return apiError(e);
  }
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
