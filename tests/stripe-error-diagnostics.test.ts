import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {safeStripeDiagnostic,stripeFailureDescription} from "../src/lib/saas/stripe-error-diagnostics";

test("erros Stripe distinguem autenticação, permissões e argumentos inválidos",()=>{
 assert.match(stripeFailureDescription(401),/STRIPE_SECRET_KEY/);
 assert.match(stripeFailureDescription(403),/permissões da chave/);
 assert.match(stripeFailureDescription(400,"parameter_invalid_integer","line_items[0][quantity]"),/Parâmetro: line_items\[0\]\[quantity\]/);
 assert.match(stripeFailureDescription(429),/limitou/);
 assert.match(stripeFailureDescription(503),/indisponível/);
});
test("não imprime mensagens ou credenciais de provedores Stripe",()=>{
 const secret="sk_live_do_not_log";
 assert.equal(safeStripeDiagnostic(secret+": chave inválida"),undefined);
 assert.equal(safeStripeDiagnostic("customer_email=private@domain.com"),undefined);
 assert.equal(safeStripeDiagnostic({secret}),undefined);
 assert.equal(safeStripeDiagnostic("payment_method_unactivated"),"payment_method_unactivated");
 assert.equal(safeStripeDiagnostic("line_items[0][price_data][currency]"),"line_items[0][price_data][currency]");
 assert.doesNotMatch(stripeFailureDescription(400,"invalid_request_error","customer_email"),/@domain.com|sk_live/);
});
test("checkout registra somente códigos seguros e não abandona verificação do resultado",()=>{
 const gateway=readFileSync("src/lib/saas/stripe-gateway.ts","utf8");
 const checkout=readFileSync("src/app/api/plataforma/saas/pilotos/[id]/checkout/route.ts","utf8");
 assert.match(gateway,/\[stripe-api\] Falha segura na API/);
 assert.match(gateway,/response\.json\(\)\.catch/);
 assert.match(gateway,/throw new BusinessError\(stripeFailureDescription/);
 assert.doesNotMatch(gateway,/console\.error\([^\n]*parsed\?\.error\?\.message/);
 assert.match(gateway,/expectedStripeCheckoutPrefix\(mode\)/);
 assert.match(checkout,/SET status='CANCELED'/);
 assert.match(checkout,/checkOrigin\(request\)/);
 assert.match(checkout,/requirePlatformAdmin\(\)/);
});
