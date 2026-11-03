import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {adminOnboardingMode} from "../src/lib/saas/admin-onboarding-mode";
const read=(p:string)=>readFileSync(p,"utf8");
test("ativação administrativa independente do cadastro público, somente produção legado",()=>{
 assert.equal(adminOnboardingMode({VERCEL_ENV:"production",SAAS_ADMIN_ONBOARDING_ENABLED:"true"}),true);
 assert.equal(adminOnboardingMode({VERCEL_ENV:"preview",SAAS_ADMIN_ONBOARDING_ENABLED:"true"}),false);
 assert.equal(adminOnboardingMode({VERCEL_ENV:"production",SAAS_ADMIN_ONBOARDING_ENABLED:"false"}),false);
 assert.equal(adminOnboardingMode({VERCEL_ENV:"production",SAAS_PRODUCTION_MODE:"true",SAAS_ADMIN_ONBOARDING_ENABLED:"true"}),false);
 assert.equal(adminOnboardingMode({VERCEL_ENV:"production",SAAS_QA_MODE:"true",SAAS_ADMIN_ONBOARDING_ENABLED:"true"}),false);
});
test("acesso antigo continua e novo usuário pode autenticar sem habilitar assinatura pública",()=>{
 const auth=read("src/lib/auth.ts");
 assert.match(auth,/publicSignupMode\(process.env\) \|\| adminOnboardingMode\(process.env\)/);
 assert.match(auth,/prisma\.user\.findUnique/);
 assert.match(auth,/loginSaas\(email,password,slug\)/);
 assert.match(auth,/session\.user\.tenantId/);
});
test("convite de conta travada exige aprovação administrativa, zero tentativas e nenhum Neon existente",()=>{
 const queue=read("src/lib/saas/secure-owner-invites.ts");
 const accept=read("src/lib/saas/invitations.ts");
 assert.match(queue,/t\.state='PROVISIONING'/);
 assert.match(queue,/j\.state='PENDING' AND j\.attempts=0/);
 assert.match(queue,/qa_provisioning_approved/);
 assert.match(queue,/valid_invites>0/);
 assert.match(accept,/item\.state==="PROVISIONING"/);
 assert.match(accept,/if\(pending \|\| preapproved\)/);
 assert.match(accept,/FOR UPDATE OF j/);
 assert.match(accept,/owner_email_verified_provisioning_queued/);
 assert.match(accept,/if\(pending\)\{/);
 assert.match(read("src/app/api/saas/convites/aceitar/route.ts"),/adminOnboardingMode\(process.env\)/);
});
test("API de reparo só funciona para admin, origem legítima e registro único; nunca recicla mensagem incerta",()=>{
 const route=read("src/app/api/plataforma/saas/tenants/[id]/ativar/route.ts");
 assert.match(route,/await requirePlatformAdmin\(\)/);
 assert.match(route,/checkOrigin\(request\)/);
 assert.match(route,/adminOnboardingMode\(process.env\)/);
 assert.match(route,/prepar/);
 assert.match(route,/identity_exists/);
 assert.match(route,/state='PENDING'/);
 assert.match(route,/o\.payload->>'reason'='SIGNUP'/);
 assert.match(route,/Convite anterior enviado ou com resultado incerto/);
 assert.match(route,/platform_notification_claims/);
 assert.match(route,/Idempotency-Key|deliverOwnerInvite/);
 assert.match(route,/owner_email_verified_provisioning_queued/);
 assert.match(route,/processOneProvisioningJob\(id\)/);
 assert.doesNotMatch(route,/UPDATE platform_tenants SET state='PENDING'|SAAS_PUBLIC_SIGNUP_ENABLED.*true/);
});
test("painel permite reparar um cadastro, sem criar senha e sem expor link de convite",()=>{
 const panel=read("src/components/platform-central-panel.tsx");
 const api=read("src/app/api/plataforma/saas/central/route.ts");
 assert.match(panel,/Enviar convite de primeiro acesso/);
 assert.match(panel,/Preparar banco após confirmação do e-mail/);
 assert.match(panel,/adminOnboardingEnabled/);
 assert.match(api,/adminOnboardingMode\(process.env\)/);
 assert.doesNotMatch(api,/password_hash|encrypted_database_url AS/);
});
