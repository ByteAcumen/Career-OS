import { redirect } from "next/navigation";

import type { DashboardTabId } from "@/components/tracker-dashboard";
import { TrackerDashboard } from "@/components/tracker-dashboard";
import { getServerSession } from "@/lib/auth-session";

export async function DashboardPageShell({
  initialTab,
}: {
  initialTab: DashboardTabId;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <TrackerDashboard
      initialTab={initialTab}
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    />
  );
}
