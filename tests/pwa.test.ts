import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import manifest from "../src/app/manifest";

test("Ducha Elitte tem manifesto e ícones instaláveis", () => {
  const m = manifest();
  assert.equal(m.short_name, "Ducha Elitte");
  assert.equal(m.display, "standalone");
  assert.equal(m.start_url, "/");
  assert.ok(m.icons?.some((i) => i.sizes === "192x192" && i.type === "image/png"));
  assert.ok(m.icons?.some((i) => i.sizes === "512x512" && i.purpose === "maskable"));
  assert.ok(m.icons?.every((i) => i.src?.includes("?v=4")));
});
test("aplicativo não faz cache dos dados pessoais no service worker", () => {
  const worker = readFileSync("public/sw.js", "utf8");
  assert.doesNotMatch(worker, /caches\.open|cache\.put|addAll/);
});

test("o símbolo enviado é usado nos ícones nativos", () => {
  const icon = readFileSync("src/lib/pwa-icon.tsx", "utf8");
  assert.match(icon, /ducha-elitte-emblema\.jpg/);
  const image = readFileSync("public/ducha-elitte-emblema.jpg");
  assert.ok(image.length > 10000, "O emblema precisa estar disponível em boa resolução.");
});
test("a barra mobile não desloca o conteúdo para baixo duas vezes", () => {
  const shell = readFileSync("src/components/layout/app-shell.tsx", "utf8");
  const styles = readFileSync("src/app/globals.css", "utf8");
  assert.match(shell, /app-topbar sticky z-30/);
  assert.match(styles, /safe-area-inset-top/);
  assert.doesNotMatch(shell, /pt-\[calc\(56px\+env\(safe-area-inset-top\)/);
});
