import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { checkOrigin, apiError } from "@/lib/api";
import { BusinessError } from "@/lib/domain";
import { mensagemChamadoSchema } from "@/lib/chamados";

export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{id: string}> }) {
  try {
    const user = await currentUser();
    checkOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > 6000)
      throw new BusinessError("Mensagem muito grande.", 413);
    const { id } = await params;
    const input = mensagemChamadoSchema.parse(await request.json());
    await prisma.$transaction(async(tx)=>{
      const chamado = await tx.chamadoSuporte.findFirst({
        where: { id, ...(user.role === "ADMIN" ? {} : { criadoPorId: user.id }) },
        select: { id: true, status: true },
      });
      if (!chamado) throw new BusinessError("Chamado não encontrado.", 404);
      if (chamado.status === "FECHADO") throw new BusinessError("Este chamado está encerrado. Abra outro para um novo assunto.",409);
      const recent = await tx.mensagemChamado.count({
        where: {
          chamadoId: id, autorId: user.id,
          createdAt: { gte: new Date(Date.now() - 24*60*60*1000) },
        },
      });
      if (recent >= 30) throw new BusinessError("Limite diário de mensagens atingido.",429);
      await tx.mensagemChamado.create({
        data: { chamadoId: id, autorTipo: "SOLICITANTE", autorId: user.id,
          autorNome: user.name, texto: input.texto },
      });
      await tx.chamadoSuporte.update({
        where: { id }, data: {
          status: chamado.status === "RESOLVIDO" || chamado.status === "AGUARDANDO_CLIENTE" ? "ABERTO" : chamado.status,
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch(e) {
    if(e instanceof SyntaxError) return NextResponse.json({error:"Dados inválidos."},{status:400});
    return apiError(e);
  }
}
