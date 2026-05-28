import { DashboardShell } from "@/components/layouts/dashboard-shell";
import DashboardPage from "./(dashboard)/page";

export default function RootPage() {
  return (
    <DashboardShell>
      <DashboardPage />
    </DashboardShell>
  );
}
