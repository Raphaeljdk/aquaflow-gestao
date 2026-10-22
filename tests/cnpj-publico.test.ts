import { test } from "node:test";
import assert from "node:assert/strict";
import { cnpjValido, resumirDadosCnpj } from "../src/lib/cnpj-publico";
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
