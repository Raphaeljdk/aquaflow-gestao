import test from "node:test";
import assert from "node:assert/strict";
import { allowedPages } from "../src/lib/permissions";

test("Apenas administrador pode acessar a aba Apps e maquininhas", () => {
  assert.equal(allowedPages.ADMIN.includes("integracoes"), true);
  for (const role of ["FUNCIONARIO", "GERENTE", "ATENDENTE", "LAVADOR"] as const) {
    assert.equal(allowedPages[role].includes("integracoes"), false, role);
  }
});
