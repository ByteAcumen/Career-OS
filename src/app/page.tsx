import { redirect } from "next/navigation";

import { TrackerDashboard } from "@/components/tracker-dashboard";
import { getServerSession } from "@/lib/auth-session";
import { claimLegacyDataForUser } from "@/lib/dashboard";

export default async function Home() {
  const session = await getServerSession();

  if (!session) {
    redirect("/sign-in");
  }

  claimLegacyDataForUser(session.user.id);

  return (
    <TrackerDashboard
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    />
  );
}
