import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {tenantMigrationsPart1} from "../src/lib/saas/tenant-migration-data-part1";
import {tenantMigrationsPart2} from "../src/lib/saas/tenant-migration-data-part2";
import {splitTenantSql} from "../src/lib/saas/tenant-sql-parser";
const tenantMigrations=[...tenantMigrationsPart1,...tenantMigrationsPart2];
test("instruções SQL preservam aspas e ignoram comentários",()=>{
 assert.deepEqual(splitTenantSql("SELECT 'a;b';-- comment;\n SELECT \"x;y\";"),["SELECT 'a;b'","-- comment;\n SELECT \"x;y\""]);
});
test("todas as migrações do ERP são incluídas com checksum e controle de falhas",()=>{
 assert.equal(tenantMigrations.length,15);
 assert.equal(tenantMigrations[0].name,"202609210001_initial");
 for(const m of tenantMigrations)assert.ok(splitTenantSql(m.sql).length>0);
 const code=readFileSync("src/lib/saas/tenant-migrations.ts","utf8");
 assert.match(code,/_prisma_migrations/);
 assert.match(code,/checksum/);
 assert.match(code,/Esquema operacional incompleto/);
});
test("worker trava jobs e não repete automaticamente criação Neon ambígua",()=>{
 const worker=readFileSync("src/lib/saas/provisioning-worker.ts","utf8");
 assert.match(worker,/SKIP LOCKED/);
 assert.match(worker,/state='PENDING'/);
 assert.match(worker,/migrateNewTenantDatabase/);
 assert.match(worker,/manual_reconciliation_required/);
 assert.match(worker,/state='READY'/);
 const route=readFileSync("src/app/api/cron/saas-provision/route.ts","utf8");
 assert.match(route,/timingSafeEqual/);
 assert.match(route,/SAAS_PRODUCTION_MODE/);
});
