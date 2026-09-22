import { StoreProvider } from "@/hooks/use-store";
import { AppShell } from "@/components/layout/app-shell";
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreProvider>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
