import {test} from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
test("bootstrap de operador central não expõe senha nem faz reset de usuário existente",()=>{
  const parsed=spawnSync(process.execPath,["--check","scripts/saas-bootstrap-admin.mjs"],{encoding:"utf8"});
  assert.equal(parsed.status,0,parsed.stderr);
  const content=readFileSync("scripts/saas-bootstrap-admin.mjs","utf8");
  assert.match(content,/SAAS_QA_MODE/);
  assert.match(content,/platform_operators/);
  assert.match(content,/Existing users retain their passwords/);
  assert.doesNotMatch(content,/console\.log\(password\)/);
});
