import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("webhook encaminha inadimplência, cancelamento, contestação e estorno a auditoria",()=>{
 const route=readFileSync("src/app/api/stripe/webhook/route.ts","utf8");
 const audit=readFileSync("src/lib/saas/stripe-incidents.ts","utf8");
 for(const type of ["invoice.payment_failed","customer.subscription.deleted","charge.refunded","charge.dispute.created"])
  assert.match(route,new RegExp(type.replaceAll(".","\\.")));
 assert.match(audit,/platform_billing_events/);
 assert.match(audit,/platform_audit_events/);
 assert.match(audit,/platform_notification_outbox/);
 assert.match(audit,/loadStripeCharge/);
 assert.match(audit,/loadStripeDispute/);
 assert.match(audit,/fullRefund/);
 assert.doesNotMatch(audit,/UPDATE platform_entitlements/);
});
test("webhook nunca concede licença por falha, cancelamento ou estorno",()=>{
 const route=readFileSync("src/app/api/stripe/webhook/route.ts","utf8");
 assert.match(route,/loadInvoice/);
 assert.match(route,/loadPaymentIntent/);
 assert.match(route,/processStripeIncident/);
 assert.match(route,/STRIPE_BILLING_ENABLED|requireStripe/);
});
