import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("provisionamento e expiração agendados no Vercel, sem iniciar cobrança",()=>{
 const config=JSON.parse(readFileSync("vercel.json","utf8"));
 const crons=config.crons.map((c:{path:string})=>c.path);
 assert.ok(crons.includes("/api/cron/saas-provision"));
 assert.ok(crons.includes("/api/cron/saas-expiry"));
 assert.equal(crons.includes("/api/stripe/webhook"),false);
});
