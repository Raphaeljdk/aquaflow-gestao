import { NextResponse, after } from "next/server";
import { whatsappGatewayReady } from "@/lib/whatsapp-oficial";
import { processarProximaComandaWhatsapp } from "@/lib/whatsapp-envios";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { snapshot, scopeData, mutate } from "@/lib/repository";
import { checkOrigin, apiError } from "@/lib/api";
import { allowedPages } from "@/lib/permissions";
import { BusinessError } from "@/lib/domain";
import type { Mutation } from "@/types";
import { withOperationalDatabase } from "@/lib/saas/operations";
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
export const maxDuration=60;
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
      const d = scopeData(await withOperationalDatabase(user,db=>snapshot(db)), user);
      const list = entity === "configuracoes" ? d.configuracao : d[entity];
      const result =
        id && Array.isArray(list) ? list.find((x) => x.id === id) : list;
      if (!result) throw new BusinessError("Registro não encontrado.", 404);
      return NextResponse.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    checkOrigin(request);
    // Dois uploads de imagem com 300 KB cada geram ~800 KB em base64.
    // O limite ampliado é EXCLUSIVO de Configurações; demais rotas permanecem restritas.
    const maxBodySize = entity === "configuracoes" ? 1100000 : 600000;
    if (Number(request.headers.get("content-length") ?? 0) > maxBodySize)
      throw new BusinessError("Requisição muito grande. Reduza o tamanho das imagens.", 413);
    const text = await request.text();
    if (text.length > maxBodySize)
      throw new BusinessError("Requisição muito grande. Reduza o tamanho das imagens.", 413);
    const data = text ? JSON.parse(text) : {};
    if (
      ["PATCH", "DELETE"].includes(request.method) &&
      !id &&
      entity !== "configuracoes"
    )
      throw new BusinessError("Informe o registro.");
    const result=await withOperationalDatabase(user,db=>mutate(
      { entity, id, method: request.method as Mutation["method"], data },
      user, db,
    ));
    if(entity==="comandas" && request.method==="PATCH" &&
       data.status==="FINALIZADO" && whatsappGatewayReady()){
      // Apenas após o COMMIT da transação; o outbox é a fonte de verdade.
      after(async()=>{
        try{await withOperationalDatabase(user,db=>processarProximaComandaWhatsapp(db));}
        catch{/* cron autenticado recupera itens PENDING; não duplicar mensagens */}
      });
    }
    return NextResponse.json(result,{status:request.method==="POST"?201:200});
  } catch (e) {
    if (e instanceof SyntaxError)
      return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    return apiError(e);
  }
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
