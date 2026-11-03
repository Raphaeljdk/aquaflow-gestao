import {test} from "node:test";
import assert from "node:assert/strict";
import {isolationMode} from "../src/lib/saas/isolation-mode";
import {readFileSync} from "node:fs";
const qa={SAAS_QA_MODE:"true",VERCEL_ENV:"preview"};
const prod={SAAS_PRODUCTION_MODE:"true",VERCEL_ENV:"production"};
test("produçao nunca volta silenciosamente ao banco legado",()=>{
 assert.equal(isolationMode({}),null);
 assert.equal(isolationMode(qa),"qa");
 assert.equal(isolationMode(prod),"production");
 assert.throws(()=>isolationMode({...prod,VERCEL_ENV:"preview"}),/Production/);
 assert.throws(()=>isolationMode({...qa,VERCEL_ENV:"production"}),/nunca/);
 assert.throws(()=>isolationMode({...prod,SAAS_QA_MODE:"true"}),/coexistir/);
});
test("rotas comuns passam pelo controle central em SaaS produção",()=>{
 const identity=readFileSync("src/lib/saas/identity.ts","utf8");
 const operations=readFileSync("src/lib/saas/operations.ts","utf8");
 const proxy=readFileSync("src/proxy.ts","utf8");
 assert.match(identity,/isolationMode\(process.env\)/);
 assert.match(operations,/if\(!saasPilotMode\(\) && !user.tenantId\) return fn\(prisma\)/);
 assert.match(operations,/if\(user.platformOperator\)throw/);
 assert.match(proxy,/isolationMode\(process.env\)/);
 assert.match(proxy,/Módulo em homologação para ambiente multiempresa/);
});
