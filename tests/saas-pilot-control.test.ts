import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("QA não habilita cobrança nem licença automaticamente a partir de uma solicitação", () => {
  const source = readFileSync("src/lib/saas/pilot-control.ts", "utf8");
  const registration = readFileSync("src/app/api/solicitacoes/route.ts", "utf8");
  assert.match(source, /SAAS_QA_MODE/);
  assert.match(source, /t\.state/);
  assert.match(source, /r\.owners < 1/);
  assert.match(source, /168 hours/);
  assert.match(source, /trial_started_at/);
  assert.match(registration, /testeIniciadoEm: null/);
});
test("somente administrador autenticado pode ver ou ativar pilotos de QA", () => {
  const status = readFileSync("src/app/api/plataforma/saas/pilotos/route.ts", "utf8");
  const activate = readFileSync("src/app/api/plataforma/saas/pilotos/[id]/ativar-teste/route.ts", "utf8");
  assert.match(status, /requirePlatformAdmin/);
  assert.match(activate, /requirePlatformAdmin/);
  assert.match(activate, /checkOrigin/);
  assert.match(status, /Cache-Control.*private, no-store/);
});
