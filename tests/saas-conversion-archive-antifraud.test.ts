import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {licenseNotificationsMode} from "../src/lib/saas/license-notifications-mode";
import {stripeBillingReadiness} from "../src/lib/saas/billing-readiness";
const read=(p:string)=>readFileSync(p,"utf8");

test("email de conversão de sete dias é único, exige vencimento real e não emite cobrança",()=>{
 const expiry=read("src/lib/saas/expiry-job.ts");
 const delivery=read("src/lib/saas/notification-providers.ts");
 assert.match(expiry,/state='TRIAL' AND trial_ends_at<=/);
 assert.match(expiry,/FOR UPDATE/);
 assert.match(expiry,/trial-to-paid:/);
 assert.match(expiry,/trial_to_paid_offer/);
 assert.match(expiry,/ON CONFLICT\(dedupe_key\) DO NOTHING/);
 assert.match(delivery,/Seu teste terminou\. Deseja continuar/);
 assert.match(delivery,/R\$ 80/);
 assert.match(delivery,/R\$ 790/);
 assert.match(delivery,/R\$ 960/);
 assert.match(delivery,/Nenhuma cobrança é feita automaticamente/);
 assert.doesNotMatch(expiry,/createStripeCheckout|Stripe\(/);
});
test("avisos pós-teste funcionam sem liberar cadastros ou convites antigos",()=>{
 assert.equal(licenseNotificationsMode({VERCEL_ENV:"production",SAAS_LICENSE_NOTIFICATIONS_ENABLED:"true"}),true);
 assert.equal(licenseNotificationsMode({VERCEL_ENV:"preview",SAAS_LICENSE_NOTIFICATIONS_ENABLED:"true"}),false);
 assert.equal(licenseNotificationsMode({VERCEL_ENV:"production",SAAS_LICENSE_NOTIFICATIONS_ENABLED:"false"}),false);
 const cron=read("src/app/api/cron/saas-notifications/route.ts");
 assert.match(cron,/licenseNotificationsMode\(process.env\)/);
 assert.match(cron,/o.template_key IN \('trial_to_paid_offer','license_status'\)/);
 assert.match(cron,/o.channel='EMAIL'/);
 assert.match(cron,/e.state IN \('EXPIRED','GRACE','SUSPENDED'\)/);
});
test("cadastro não duplica email, WhatsApp nem CNPJ e preserva marcação de uso mesmo arquivado",()=>{
 const signup=read("src/lib/saas/signup.ts");
 const route=read("src/app/api/solicitacoes/route.ts");
 const ddl=read("architecture/saas/registration-hardening-20261103.sql");
 assert.match(signup,/owner_whatsapp=\$\{phone\}/);
 assert.match(signup,/owner_cnpj=\$\{cnpj\}/);
 assert.match(signup,/lower\(owner_email\)=\$\{email\}/);
 assert.match(signup,/keys=\[/);
 assert.match(signup,/\.sort\(\)/);
 assert.match(signup,/pg_advisory_xact_lock/);
 assert.match(signup,/validCnpj/);
 assert.match(signup,/cnpj:info\.cnpj/);
 assert.match(route,/cnpj:body\.data\.cnpj/);
 assert.match(route,/assertRegistrationIdentityAvailable/);
 assert.match(route,/where:\{OR:/);
 assert.match(ddl,/owner_cnpj TEXT/);
 assert.match(ddl,/platform_tenants_email_lower_unique/);
 assert.match(ddl,/platform_tenants_cnpj_unique/);
});
test("somente cadastro vazio sem banco, licença, pagamento ou convite pode ser arquivado",()=>{
 const route=read("src/app/api/plataforma/saas/tenants/[id]/arquivar/route.ts");
 const central=read("src/app/api/plataforma/saas/central/route.ts");
 const panel=read("src/components/platform-central-panel.tsx");
 assert.match(route,/await requirePlatformAdmin\(\)/);
 assert.match(route,/checkOrigin\(request\)/);
 assert.match(route,/confirmation:z.literal\("ARQUIVAR"\)/);
 assert.match(route,/t\.has_db/);
 assert.match(route,/t\.owner_count!==0/);
 assert.match(route,/t\.charges!==0/);
 assert.match(route,/t\.invitations!==0/);
 assert.match(route,/t\.job_attempts!==0/);
 assert.match(route,/SET state='SUSPENDED'/);
 assert.match(route,/tenant_archived/);
 assert.doesNotMatch(route,/DELETE FROM|dropTable|deleteNeon/);
 assert.match(central,/filter.*archived|archived.*filter/s);
 assert.match(panel,/Arquivar cadastro incompleto/);
 assert.match(panel,/value="archived"/);
});
test("Stripe nunca parece ativo só porque existem nomes de variáveis",()=>{
 const ready=stripeBillingReadiness({
  VERCEL_ENV:"production",STRIPE_BILLING_ENABLED:"true",STRIPE_SECRET_KEY:"sk_live_example",
  STRIPE_WEBHOOK_SECRET:"whsec_example",CONTROL_DATABASE_URL:"postgres://example"
 });
 assert.equal(ready.liveConfigurationReady,false);
 assert.ok(ready.blockers.some(x=>x.includes("Migração")));
 assert.ok(ready.checksStillRequired.some(x=>x.includes("Webhook")));
 const live=stripeBillingReadiness({
  VERCEL_ENV:"production",SAAS_PRODUCTION_MODE:"true",STRIPE_BILLING_ENABLED:"true",
  STRIPE_SECRET_KEY:"sk_live_example",STRIPE_WEBHOOK_SECRET:"whsec_example",
  CONTROL_DATABASE_URL:"postgres://example",STRIPE_PIX_ENABLED:"false"
 });
 assert.equal(live.liveConfigurationReady,true);
 assert.equal(live.pixFlagEnabled,false);
 assert.match(read("src/components/platform-central-panel.tsx"),/Pagamentos Stripe/);
});
