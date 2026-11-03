import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validNewPassword,recoveryLinkMinutes} from "../src/lib/auth/recovery-policy";
const read=(path:string)=>readFileSync(path,"utf8");
test("senha forte de 12+ caracteres e expiração curta",()=>{
 assert.equal(recoveryLinkMinutes,20);
 assert.equal(validNewPassword("senhafraca"),false);
 assert.equal(validNewPassword("SenhaSegura12345"),true);
 assert.equal(validNewPassword("shortX1"),false);
});
test("recuperação pública não enumera contas e limita frequência por rede e e-mail",()=>{
 const request=read("src/lib/auth/account-recovery-request.ts");
 const route=read("src/app/api/auth/solicitar-recuperacao/route.ts");
 assert.match(request,/genericRecoveryMessage/);
 assert.match(route,/genericRecoveryMessage/);
 assert.match(request,/pw-reset-email-/);
 assert.match(request,/pw-reset-ip-/);
 assert.match(request,/platform_login_attempts/);
 assert.match(request,/state IN \('PENDING','PROVISIONING','ERROR'\)/);
 assert.match(request,/platform_password_recovery/);
 assert.match(request,/randomBytes\(32\)/);
 assert.match(request,/createHash\("sha256"\)/);
 assert.match(route,/checkOrigin\(request\)/);
});
test("token armazenado como hash, consumido uma única vez, preservando contas e bancos",()=>{
 const complete=read("src/lib/auth/account-recovery-complete.ts");
 assert.match(complete,/token_hash=\$1/);
 assert.match(complete,/used_at IS NULL AND expires_at>now\(\)/);
 assert.match(complete,/UPDATE platform_identities SET password_hash/);
 assert.match(complete,/tx.user.update/);
 assert.match(complete,/compare\(newPassword/);
 assert.doesNotMatch(complete,/INSERT INTO platform_tenants|createNeonTenantProject/);
});
test("alteração autenticada exige senha atual e limita tentativas",()=>{
 const route=read("src/app/api/auth/alterar-senha/route.ts");
 assert.match(route,/currentUser\(\)/);
 assert.match(route,/currentPassword/);
 assert.match(route,/compare\(values.currentPassword/);
 assert.match(route,/platform_login_attempts/);
 assert.match(route,/checkOrigin\(request\)/);
 assert.match(route,/FOR UPDATE/);
});
test("login fornece recuperação, sessão autenticada acompanha versão da senha e ajustes disponíveis para colaboradores",()=>{
 const login=read("src/components/login.tsx");
 const auth=read("src/lib/auth.ts");
 const ui=read("src/components/layout/app-shell.tsx");
 assert.match(login,/Esqueci minha senha/);
 assert.match(login,/Ainda não criei minha senha/);
 assert.match(auth,/token.passwordVersion/);
 assert.match(auth,/senha desta conta foi alterada/);
 assert.match(ui,/Minha conta e senha/);
 assert.match(read("src/proxy.ts"),/minha-conta/);
});
test("migração executa somente em produção e valida banco central isolado",()=>{
 const script=read("scripts/prepare-password-recovery.mjs");
 assert.match(script,/VERCEL_ENV!=="production"/);
 assert.match(script,/a.hostname===b.hostname/);
 assert.match(script,/CREATE TABLE IF NOT EXISTS platform_password_recovery/);
 assert.match(read("package.json"),/prepare-password-recovery\.mjs/);
});
