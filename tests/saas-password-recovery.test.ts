import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p:string)=>readFileSync(p,"utf8");
test("login mobile oferece recuperação de senha sem expor credenciais",()=>{
 const login=read("src/components/login.tsx");
 assert.match(login,/href="\/esqueci-senha"/);
 assert.match(login,/Esqueci minha senha/);
 assert.match(login,/Se ainda não criou sua senha pelo convite/);
});
test("pedido de reset é neutro para contas não ativadas e envia link expirável",()=>{
 const service=read("src/lib/saas/password-reset.ts");
 assert.match(service,/const NEUTRAL=/);
 assert.match(service,/randomBytes\(32\)/);
 assert.match(service,/now\(\)\+INTERVAL '30 minutes'/);
 assert.match(service,/emailHash/);
 assert.match(service,/originHash/);
 assert.match(service,/accounts?/i);
});
test("reset não armazena token em claro e valida uso único",()=>{
 const service=read("src/lib/saas/password-reset.ts");
 assert.match(service,/token_hash/);
 assert.match(service,/state='PENDING' AND expires_at>now\(\)/);
 assert.match(service,/FOR UPDATE/);
 assert.match(service,/state='USED'/);
 assert.match(service,/hash\(password,12\)/);
 assert.match(service,/account_kind/);
 assert.doesNotMatch(service,/console\.log\(token/);
});
test("rotas de senha aplicam checkOrigin e não exigem sessão prévia",()=>{
 for(const path of ["src/app/api/auth/esqueci-senha/route.ts","src/app/api/auth/redefinir-senha/route.ts"]){
  const s=read(path);
  assert.match(s,/checkOrigin\(request\)/);
  assert.match(s,/Content-Type|content-length/);
  assert.match(s,/no-store/);
 }
});
test("tabela de reset é criada apenas no controle central e expira",()=>{
 const ddl=read("architecture/saas/password-reset-20261103.sql");
 assert.match(ddl,/CREATE TABLE IF NOT EXISTS platform_password_resets/);
 assert.match(ddl,/token_hash TEXT NOT NULL UNIQUE/);
 assert.match(ddl,/expires_at TIMESTAMPTZ NOT NULL/);
 assert.match(ddl,/email_hash/);
 assert.match(ddl,/origin_hash/);
});
