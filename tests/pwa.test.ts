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
  assert.ok(m.icons?.every((i) => i.src?.includes("?v=3")));
});
test("aplicativo não faz cache dos dados pessoais no service worker", () => {
  const worker = readFileSync("public/sw.js", "utf8");
  assert.doesNotMatch(worker, /caches\.open|cache\.put|addAll/);
});
