import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("proxy preserva APIs públicas de produção e bloqueia as não migradas no SaaS QA",()=>{
 const s=readFileSync("src/proxy.ts","utf8");
 assert.match(s,/SAAS_QA_MODE !== "true" && request.nextUrl.pathname.startsWith\("\/api\/"\)/);
 assert.match(s,/Módulo em homologação para ambiente multiempresa/);
 assert.match(s,/\/api\/:path\*/);
});
