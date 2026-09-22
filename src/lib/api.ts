import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { BusinessError } from "./domain";
export function apiError(error: unknown) {
  if (error instanceof BusinessError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: error.errors[0]?.message ?? "Dados inválidos.",
        fields: error.flatten(),
      },
      { status: 400 },
    );
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return NextResponse.json(
        { error: "Já existe um registro com estes dados." },
        { status: 409 },
      );
    if (["P2003", "P2004", "P2034"].includes(error.code))
      return NextResponse.json(
        {
          error: "Conflito de registros. Atualize os dados e tente novamente.",
        },
        { status: 409 },
      );
  }
  console.error(
    "AquaFlow API failure",
    error instanceof Error ? error.name : "Unknown",
  );
  return NextResponse.json(
    {
      error:
        "Não foi possível acessar o sistema. Verifique a conexão e tente novamente.",
    },
    { status: 503 },
  );
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin)
    throw new BusinessError("Origem da requisição inválida.", 403);
}
