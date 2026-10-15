import test from "node:test";
import assert from "node:assert/strict";
import { validProvisionedUser } from "../scripts/bootstrap-account-guard.mjs";

const hash = "$2b$12$" + "A".repeat(53);
test("contas de produção podem manter senhas alteradas sem impedir deploy", () => {
  assert.equal(validProvisionedUser({ ativo: true, role: "ADMIN", password: hash }, "ADMIN"), true);
  assert.equal(validProvisionedUser({
    ativo: true, role: "FUNCIONARIO", password: hash, funcionarioId: "func-1",
  }, "FUNCIONARIO", true), true);
});
test("contas bloqueadas, funções trocadas e hashes inválidos não passam", () => {
  assert.equal(validProvisionedUser(null, "ADMIN"), false);
  assert.equal(validProvisionedUser({ ativo: false, role: "ADMIN", password: hash }, "ADMIN"), false);
  assert.equal(validProvisionedUser({ ativo: true, role: "FUNCIONARIO", password: hash }, "ADMIN"), false);
  assert.equal(validProvisionedUser({ ativo: true, role: "ADMIN", password: "plaintext" }, "ADMIN"), false);
  assert.equal(validProvisionedUser({ ativo: true, role: "ADMIN", password: "$2b$12$short" }, "ADMIN"), false);
  assert.equal(validProvisionedUser({ ativo: true, role: "FUNCIONARIO", password: hash }, "FUNCIONARIO", true), false);
});
