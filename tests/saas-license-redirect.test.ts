import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("licença vencida remove dados da interface e não simula checkout bancário",()=>{
 const store=readFileSync("src/hooks/use-store.tsx","utf8");
 const page=readFileSync("src/app/assinatura/page.tsx","utf8");
 assert.match(store,/res\.status === 423/);
 assert.match(store,/setData\(null\)/);
 assert.match(store,/window\.location\.replace\("\/assinatura/);
 assert.match(page,/cobrança automática ainda está em homologação/);
 assert.match(page,/R\$ 790/);
});
