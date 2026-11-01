import { test } from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("o treinamento ilustrado é exibido dentro da área autenticada sem remover vídeo existente",()=>{
  const page=readFileSync("src/app/(dashboard)/como-usar/page.tsx","utf8");
  assert.match(page,/Treinamento operacional Ducha Elitte/);
  assert.match(page,/share\.descript\.com\/embed\/v3pWHD1uqeQ/);
  assert.match(page,/data\?\.configuracao\.manualVideoUrl/);
  assert.match(page,/O vídeo mostra orientações/);
  assert.doesNotMatch(page,/password|INTER_CLIENT_SECRET/);
});
