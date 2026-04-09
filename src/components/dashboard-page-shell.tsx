import { redirect } from "next/navigation";

import type { DashboardTabId } from "@/components/tracker-dashboard";

const tabRoutes: Record<DashboardTabId, string> = {
  overview: "/home",
  today: "/planner",
  logger: "/logger",
  history: "/progress",
  settings: "/settings",
};

export async function DashboardPageShell({
  initialTab,
}: {
  initialTab: DashboardTabId;
}) {
  redirect(tabRoutes[initialTab]);
}
