import { NextResponse } from "next/server";
import { cnpjValido, resumirDadosCnpj, resumirDadosCnpjWs, type DadosPublicosCnpj } from "@/lib/cnpj-publico";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Os destinos são fixos, o CNPJ é validado e os dados de sócios (QSA) nunca são devolvidos.
const fornecedores: Array<{
  nome: string;
  url: (cnpj: string) => string;
  normalizar: (dados: Record<string, unknown>, cnpj: string) => DadosPublicosCnpj;
}> = [
  {
    nome: "BrasilAPI",
    url: (cnpj) => "https://brasilapi.com.br/api/cnpj/v1/" + cnpj,
    normalizar: resumirDadosCnpj,
  },
  {
    nome: "Minha Receita",
    url: (cnpj) => "https://minhareceita.org/" + cnpj,
    normalizar: resumirDadosCnpj,
  },
  {
    nome: "CNPJ.ws",
    url: (cnpj) => "https://publica.cnpj.ws/cnpj/" + cnpj,
    normalizar: resumirDadosCnpjWs,
  },
];

const cabecalhos = { "Cache-Control": "no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ cnpj: string }> }) {
  const { cnpj: entrada } = await params;
  const cnpj = entrada.replace(/\D/g, "");

  if (!cnpjValido(cnpj)) {
    return NextResponse.json(
      { error: "CNPJ inválido. Confira os 14 dígitos." },
      { status: 400, headers: cabecalhos },
    );
  }

  let naoEncontrados = 0;
  for (const fornecedor of fornecedores) {
    try {
      const response = await fetch(fornecedor.url(cnpj), {
        headers: {
          Accept: "application/json",
          // O User-Agent padrão do fetch do Node pode ser bloqueado pelo WAF da BrasilAPI.
          "User-Agent": "AquaFlow-Gestao/1.0",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });

      if (response.status === 404) {
        naoEncontrados++;
        continue;
      }
      if (!response.ok) {
        console.warn("[cnpj] provedor indisponível", fornecedor.nome, response.status);
        continue;
      }
      const corpo: unknown = await response.json();
      if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) continue;

      const dados = fornecedor.normalizar(corpo as Record<string, unknown>, cnpj);
      if (!dados.razaoSocial) continue;
      return NextResponse.json(dados, { headers: cabecalhos });
    } catch (erro) {
      // Não registrar o CNPJ nem a resposta integral, para evitar dados desnecessários nos logs.
      console.warn("[cnpj] falha ao consultar provedor", fornecedor.nome, erro instanceof Error ? erro.name : "erro");
    }
  }

  const naoLocalizado = naoEncontrados === fornecedores.length;
  return NextResponse.json(
    {
      error: naoLocalizado
        ? "CNPJ não localizado nas bases consultadas. Confira o número ou preencha manualmente."
        : "Os serviços de consulta estão temporariamente indisponíveis. Tente novamente ou preencha manualmente.",
    },
    { status: naoLocalizado ? 404 : 503, headers: cabecalhos },
  );
}
