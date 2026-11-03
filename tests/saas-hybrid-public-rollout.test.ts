import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {publicSignupMode} from "../src/lib/saas/public-signup-mode";
const source=(path:string)=>readFileSync(path,"utf8");
test("cadastro publico habilita apenas em produção, independentemente do switch global de login",()=>{
 assert.equal(publicSignupMode({SAAS_PUBLIC_SIGNUP_ENABLED:"true",VERCEL_ENV:"production"}),true);
 assert.equal(publicSignupMode({SAAS_PUBLIC_SIGNUP_ENABLED:"true",VERCEL_ENV:"preview"}),false);
 assert.equal(publicSignupMode({SAAS_PUBLIC_SIGNUP_ENABLED:"false",VERCEL_ENV:"production"}),false);
 assert.equal(publicSignupMode({SAAS_PUBLIC_SIGNUP_ENABLED:"true",SAAS_PRODUCTION_MODE:"true",VERCEL_ENV:"production"}),false);
 assert.equal(publicSignupMode({SAAS_PUBLIC_SIGNUP_ENABLED:"true",SAAS_QA_MODE:"true",VERCEL_ENV:"production"}),false);
});
test("login legado nunca perde seu usuario e sessao tenant revalida banco central",()=>{
 const auth=source("src/lib/auth.ts");
 const db=source("src/lib/saas/operations.ts");
 assert.match(auth,/publicSignupMode\(process.env\)/);
 assert.match(auth,/prisma.user.findUnique/);
 assert.match(auth,/loginSaas\(email,password,slug\)/);
 assert.match(auth,/session.user.tenantId/);
 assert.match(db,/!saasPilotMode\(\) && !user.tenantId/);
 assert.match(db,/if\(user.platformOperator\)throw/);
 assert.match(db,/resolveSaasConnection/);
});
test("somente email confirmado pode criar banco por cron publico; nunca reprocessar legado",()=>{
 const cron=source("src/app/api/cron/saas-provision/route.ts");
 assert.match(cron,/owner_email_verified_provisioning_queued/);
 assert.match(cron,/processOneProvisioningJob\(rows\[0\]\.tenant_id\)/);
 assert.match(cron,/CRON_SECRET/);
 assert.match(source("src/app/api/cron/saas-notifications/route.ts"),/publicSignupMode\(process.env\)/);
});
test("convites aceitos sem comutar modo global e reservas publicas com slug",()=>{
 const accept=source("src/app/api/saas/convites/aceitar/route.ts");
 const publicTenant=source("src/lib/saas/public-tenant.ts");
 const signup=source("src/app/api/solicitacoes/route.ts");
 assert.match(accept,/publicSignupMode\(process.env\)/);
 assert.match(publicTenant,/!publicSignupMode\(process.env\)\|\|!slug/);
 assert.match(signup,/saasPilotMode\(\) \|\| publicSignupMode\(process.env\)/);
});
