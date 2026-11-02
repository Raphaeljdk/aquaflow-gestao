import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { PlatformDashboard } from "@/components/platform-dashboard";
import { SaasQaDashboard } from "@/components/saas-qa-dashboard";
import { SaasProductionDashboard } from "@/components/saas-production-dashboard";
export const dynamic = "force-dynamic";
export default async function PlatformPage() {
  try { await requirePlatformAdmin(); }
  catch { redirect("/login"); }
  if(process.env.SAAS_QA_MODE==="true")return <SaasQaDashboard />;
  if(process.env.SAAS_PRODUCTION_MODE==="true")return <SaasProductionDashboard />;
  return <PlatformDashboard />;
}
