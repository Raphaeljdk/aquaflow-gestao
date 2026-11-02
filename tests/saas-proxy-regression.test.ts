import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("proxy preserva o legado desligado e bloqueia APIs sem tenant nos modos SaaS QA e produção",()=>{
 const s=readFileSync("src/proxy.ts","utf8");
 assert.match(s,/isolationMode\(process.env\)/);
 assert.match(s,/!isolated && request.nextUrl.pathname.startsWith/);
 assert.match(s,/Both QA and production must block/);
 assert.match(s,/Módulo em homologação para ambiente multiempresa/);
 assert.match(s,/\/api\/:path\*/);
 assert.match(s,/saas-provision/);
});
