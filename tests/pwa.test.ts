import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import manifest from "../src/app/manifest";

test("AquaFlow possui manifesto instalável no Android e iPhone", () => {
  const data = manifest();
  assert.equal(data.name, "AquaFlow | Gestão de Lava-Rápido");
  assert.equal(data.short_name, "AquaFlow");
  assert.equal(data.display, "standalone");
  assert.equal(data.start_url, "/");
  assert.equal(data.scope, "/");
  const icons = data.icons || [];
  assert.ok(icons.some((icon) => icon.sizes === "192x192" && icon.type === "image/png"));
  assert.ok(icons.some((icon) => icon.sizes === "512x512" && icon.type === "image/png"));
  assert.ok(icons.some((icon) => icon.purpose?.includes("maskable")));
});
test("service worker não guarda dados privados de clientes ou finanças", () => {
  const worker = readFileSync("public/sw.js", "utf8");
  assert.match(worker, /skipWaiting/);
  assert.match(worker, /clients.claim/);
  assert.doesNotMatch(worker, /caches\.open|cache\.put|addAll/);
});
