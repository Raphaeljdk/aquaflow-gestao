import { test } from "node:test";
import assert from "node:assert/strict";
import { cnpjValido, resumirDadosCnpj, resumirDadosCnpjWs } from "../src/lib/cnpj-publico";
test("recusa CNPJ inválido e aceita DV legítimo", () => {
  assert.equal(cnpjValido("11.222.333/0001-81"), true);
  assert.equal(cnpjValido("11.222.333/0001-82"), false);
  assert.equal(cnpjValido("00000000000000"), false);
  assert.equal(cnpjValido("123"), false);
});
test("resumo limita informações a campos públicos do estabelecimento", () => {
  const data = resumirDadosCnpj({
    razao_social: "Empresa Exemplo LTDA", nome_fantasia: "Lava Azul",
    municipio: "Itapevi", uf: "SP", logradouro: "Rua A", numero: "100",
    qsa: [{ nome_socio: "Informação privada" }], descricao_situacao_cadastral: "ATIVA",
  }, "11222333000181");
  assert.equal(data.nomeFantasia, "Lava Azul");
  assert.equal(data.cidade, "Itapevi, SP");
  assert.equal(JSON.stringify(data).includes("Informação privada"), false);
});


test("formato CNPJ.ws preenche nome, endereço e situação sem expor sócios", () => {
  const dados = resumirDadosCnpjWs({
    razao_social: "LAVA RÁPIDO MODELO LTDA",
    socios: [{ nome: "Não publicar" }],
    porte: { descricao: "ME" },
    estabelecimento: {
      nome_fantasia: "Lava Modelo",
      situacao_cadastral: "Ativa",
      tipo_logradouro: "Rua",
      logradouro: "Principal",
      numero: "25",
      bairro: "Centro",
      cep: "06700000",
      cidade: { nome: "Cotia" },
      estado: { sigla: "SP" },
      email: "CONTATO@EXEMPLO.COM",
      ddd1: "11",
      telefone1: "43211234",
      atividade_principal: { id: "4520005", descricao: "Serviços de lavagem" },
    },
  }, "11222333000181");

  assert.equal(dados.razaoSocial, "LAVA RÁPIDO MODELO LTDA");
  assert.equal(dados.nomeFantasia, "Lava Modelo");
  assert.equal(dados.cidade, "Cotia, SP");
  assert.equal(dados.situacao, "Ativa");
  assert.match(dados.endereco, /Principal/);
  assert.equal(dados.telefoneComercial, "11 43211234");
  assert.match(dados.atividadePrincipal, /Serviços de lavagem/);
  assert.equal(JSON.stringify(dados).includes("Não publicar"), false);
});

test("CNPJ.ws incompleto não causa erro de leitura de objetos aninhados", () => {
  const dados = resumirDadosCnpjWs({ razao_social: "EXEMPLO", estabelecimento: null }, "11222333000181");
  assert.equal(dados.razaoSocial, "EXEMPLO");
  assert.equal(dados.cidade, "");
  assert.equal(dados.endereco, "");
});
