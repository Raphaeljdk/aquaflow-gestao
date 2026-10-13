import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { PlatformDashboard } from "@/components/platform-dashboard";
export const dynamic = "force-dynamic";
export default async function PlatformPage() {
  try { await requirePlatformAdmin(); }
  catch { redirect("/login"); }
  return <PlatformDashboard />;
}
