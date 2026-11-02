import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("central de ajuda reproduz os dois vídeos oficiais da Ducha Elitte", () => {
  const page = readFileSync("src/app/(dashboard)/como-usar/page.tsx", "utf8");
  assert.match(page, /Treinamento Ducha Elitte/);
  assert.match(page, /Guia rápido \(32 segundos\)/);
  assert.match(page, /Treinamento completo \(1 minuto e 48 segundos\)/);
  assert.match(page, /zbpfvd9tctfhm3g8\.public\.blob\.vercel-storage\.com/);
  assert.match(page, /ducha_elitte_guia_rapido_todas_abas\.mp4/);
  assert.match(page, /ducha_elitte_treinamento_abas_suporte_chamados\.mp4/);
  assert.match(page, /controls playsInline/);
  assert.match(page, /max-w-\[1480px\]/);
  assert.match(page, /lg:grid-cols-2/);
  assert.match(page, /href="#treinamentos"/);
  assert.match(page, /href="#modulos"/);
  assert.match(page, /Abrir manual em PDF/);
  assert.match(page, /data\?\.configuracao\.manualVideoUrl/);
  assert.match(page, /href="\/suporte"/);
  assert.doesNotMatch(page, /share\.descript\.com\/embed\/v3pWHD1uqeQ/);
  assert.doesNotMatch(page, /INTER_CLIENT_SECRET/);
});
