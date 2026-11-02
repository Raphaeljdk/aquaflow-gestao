import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("central de ajuda oferece dois vídeos da Ducha Elitte sem perder o material anterior", () => {
  const page = readFileSync("src/app/(dashboard)/como-usar/page.tsx", "utf8");
  assert.match(page, /Treinamento Ducha Elitte/);
  assert.match(page, /Guia rápido — 40 segundos/);
  assert.match(page, /Treinamento completo — 1 minuto e 54 segundos/);
  assert.match(page, /ducha_elitte_guia_rapido_todas_abas\.mp4/);
  assert.match(page, /ducha_elitte_treinamento_abas_suporte_chamados\.mp4/);
  assert.match(page, /method: "HEAD"/);
  assert.match(page, /share\.descript\.com\/embed\/v3pWHD1uqeQ/);
  assert.match(page, /data\?\.configuracao\.manualVideoUrl/);
  assert.match(page, /href="\/suporte"/);
  assert.doesNotMatch(page, /password|INTER_CLIENT_SECRET/);
});
