import { test } from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
test("executor do Neon é sintaticamente válido e só roda no QA protegido",()=>{
  const child=spawnSync(process.execPath,["--check","scripts/saas-provision-worker.mjs"],{encoding:"utf8"});
  assert.equal(child.status,0,child.stderr);
  const s=readFileSync("scripts/saas-provision-worker.mjs","utf8");
  assert.match(s,/SAAS_QA_MODE/);
  assert.match(s,/FOR UPDATE OF j,t SKIP LOCKED/);
  assert.match(s,/migrate","deploy/);
  assert.match(s,/_prisma_migrations/);
  assert.match(s,/state='READY'/);
  assert.match(s,/connection_uri/);
  assert.match(s,/projectByName/);
});
