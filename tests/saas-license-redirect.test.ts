import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("licença vencida remove dados da interface e só libera checkout real se Stripe estiver pronta",()=>{
 const store=readFileSync("src/hooks/use-store.tsx","utf8");
 const page=readFileSync("src/app/assinatura/page.tsx","utf8");
 assert.match(store,/res\.status === 423/);
 assert.match(store,/setData\(null\)/);
 assert.match(store,/window\.location\.replace\("\/assinatura/);
 assert.match(page,/Pagamentos temporariamente em homologação/);
 assert.match(page,/api\/assinatura\/disponibilidade/);
 assert.match(page,/api\/assinatura\/checkout/);
 assert.match(page,/Seu e-mail foi confirmado pelo link de uso único/);
 assert.match(page,/R\$ 790/);
});
