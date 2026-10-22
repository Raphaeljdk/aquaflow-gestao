import { NextResponse } from "next/server";
import { cnpjValido, resumirDadosCnpj } from "@/lib/cnpj-publico";
export const dynamic = "force-dynamic";

// Proxy seguro com destino fixo e retorno mínimo. Não fornece QSA nem outros dados pessoais.
export async function GET(_request: Request, { params }: { params: Promise<{ cnpj: string }> }) {
  const { cnpj: raw } = await params;
  const cnpj = raw.replace(/\D/g, "");
  if (!cnpjValido(cnpj)) return NextResponse.json({ error: "CNPJ inválido. Confira os 14 dígitos." }, { status: 400 });
  try {
    const response = await fetch("https://brasilapi.com.br/api/cnpj/v1/" + cnpj, {
      headers: { Accept: "application/json" }, cache: "no-store",
      signal: AbortSignal.timeout(6500),
    });
    if (!response.ok) {
      const status = response.status === 404 ? 404 : 503;
      return NextResponse.json({ error: status === 404 ? "CNPJ não localizado. Preencha manualmente." : "Consulta indisponível. Preencha manualmente." }, { status });
    }
    const body = await response.json() as Record<string, unknown>;
    const dados = resumirDadosCnpj(body, cnpj);
    if (!dados.razaoSocial) return NextResponse.json({ error: "Dados incompletos. Preencha manualmente." }, { status: 502 });
    return NextResponse.json(dados, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Serviço de consulta indisponível. Preencha manualmente." }, { status: 503 });
  }
}
