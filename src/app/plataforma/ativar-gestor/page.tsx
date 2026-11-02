import {redirect} from "next/navigation";
import {requirePlatformAdmin} from "@/lib/platform-admin";
import {BootstrapOperatorForm} from "@/components/saas-bootstrap-operator-form";
export const dynamic="force-dynamic";
export default async function BootstrapCentralOperator() {
 try {await requirePlatformAdmin();}
 catch{redirect("/login")}
 if(process.env.SAAS_PRODUCTION_MODE==="true"||process.env.VERCEL_ENV!=="production")
  redirect("/plataforma");
 return <BootstrapOperatorForm/>;
}
