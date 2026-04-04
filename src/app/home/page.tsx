export const dynamic = "force-dynamic";

import { DashboardPageShell } from "@/components/dashboard-page-shell";

export default async function HomePage() {
  return <DashboardPageShell initialTab="overview" />;
}
