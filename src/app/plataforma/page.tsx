import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { PlatformDashboard } from "@/components/platform-dashboard";
import { SaasQaDashboard } from "@/components/saas-qa-dashboard";
export const dynamic = "force-dynamic";
export default async function PlatformPage() {
  try { await requirePlatformAdmin(); }
  catch { redirect("/login"); }
  return process.env.SAAS_QA_MODE === "true" ? <SaasQaDashboard /> : <PlatformDashboard />;
}
