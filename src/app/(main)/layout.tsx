import { AppShell } from "@/components/layout/AppShell";
import { AppGuard } from "@/components/layout/AuthGuard";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppGuard>
      <AppShell>{children}</AppShell>
    </AppGuard>
  );
}
