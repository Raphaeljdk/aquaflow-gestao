export type DadosPublicosCnpj = {
  cnpj: string; razaoSocial: string; nomeFantasia: string;
  cidade: string; endereco: string; situacao: string;
  uf: string; cep: string; bairro: string; telefoneComercial: string; email: string;
  porte: string; naturezaJuridica: string; atividadePrincipal: string; dataAbertura: string;
};
// Validação DV tradicional: evita consultas acidentais a identificadores inválidos.
export function cnpjValido(entrada: string): boolean {
  const cnpj = entrada.replace(/\D/g, "");
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1+$/.test(cnpj)) return false;
  const dv = (tamanho: number) => {
    const pesos = tamanho === 12
      ? [5,4,3,2,9,8,7,6,5,4,3,2]
      : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    const soma = pesos.reduce((total, peso, i) => total + Number(cnpj[i]) * peso, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return Number(cnpj[12]) === dv(12) && Number(cnpj[13]) === dv(13);
}
export function resumirDadosCnpj(data: Record<string, unknown>, cnpj: string): DadosPublicosCnpj {
  const str = (key: string) => typeof data[key] === "string" ? String(data[key]).trim().slice(0, 200) : "";
  const endereco = [str("descricao_tipo_de_logradouro"), str("logradouro"), str("numero"),
    str("complemento"), str("bairro"), str("municipio"), str("uf"), str("cep")].filter(Boolean).join(", ");
  return {
    cnpj, razaoSocial: str("razao_social"), nomeFantasia: str("nome_fantasia"),
    cidade: [str("municipio"), str("uf")].filter(Boolean).join(", "),
    endereco: endereco.slice(0, 300), situacao: str("descricao_situacao_cadastral"),
    uf: str("uf"), cep: str("cep"), bairro: str("bairro"),
    email: str("email"), telefoneComercial: str("ddd_telefone_1"),
    porte: str("porte") || str("descricao_porte"), naturezaJuridica: str("natureza_juridica"),
    atividadePrincipal: [data.cnae_fiscal ? String(data.cnae_fiscal) : "", str("cnae_fiscal_descricao")].filter(Boolean).join(" - ").slice(0, 250),
    dataAbertura: str("data_inicio_atividade").slice(0, 10),
  };
}


/** A API pública CNPJ.ws tem um formato aninhado, diferente da BrasilAPI/Minha Receita. */
export function resumirDadosCnpjWs(data: Record<string, unknown>, cnpj: string): DadosPublicosCnpj {
  const registro = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const estabelecimento = registro(data.estabelecimento);
  const cidade = registro(estabelecimento.cidade);
  const estado = registro(estabelecimento.estado);
  const atividade = registro(estabelecimento.atividade_principal);
  const porte = registro(data.porte);
  const natureza = registro(data.natureza_juridica);
  const texto = (value: unknown) => typeof value === "string" ? value : "";

  return resumirDadosCnpj({
    razao_social: data.razao_social,
    nome_fantasia: estabelecimento.nome_fantasia,
    municipio: cidade.nome,
    uf: estado.sigla,
    descricao_tipo_de_logradouro: estabelecimento.tipo_logradouro,
    logradouro: estabelecimento.logradouro,
    numero: estabelecimento.numero,
    complemento: estabelecimento.complemento,
    bairro: estabelecimento.bairro,
    cep: estabelecimento.cep,
    descricao_situacao_cadastral: estabelecimento.situacao_cadastral,
    email: estabelecimento.email,
    ddd_telefone_1: [texto(estabelecimento.ddd1), texto(estabelecimento.telefone1)].filter(Boolean).join(" "),
    porte: porte.descricao,
    natureza_juridica: natureza.descricao,
    cnae_fiscal: atividade.id,
    cnae_fiscal_descricao: atividade.descricao,
    data_inicio_atividade: estabelecimento.data_inicio_atividade,
  }, cnpj);
}
