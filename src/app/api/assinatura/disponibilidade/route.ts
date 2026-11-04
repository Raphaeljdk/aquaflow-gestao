import {NextResponse} from "next/server";
import {resolveStripeMode} from "@/lib/saas/stripe-mode";
export const runtime="nodejs";
export const dynamic="force-dynamic";
/** Only booleans exposed: never return keys, configuration values or account IDs. */
export async function GET(){
 let ready=false;
 try{ready=resolveStripeMode(process.env)!==null && !!process.env.RESEND_API_KEY &&
   !!process.env.NOTIFICATION_FROM_EMAIL;}catch{}
 return NextResponse.json({checkoutAvailable:ready,
   pixAvailable:ready && process.env.STRIPE_PIX_ENABLED==="true"},
   {headers:{"Cache-Control":"private,no-store"}});
}
