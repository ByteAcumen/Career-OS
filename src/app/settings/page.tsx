export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { WorkspaceSettingsPage } from "@/components/workspace/settings-page";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getServerSession } from "@/lib/auth-session";
import { isOnboardingComplete } from "@/lib/onboarding";
import { getSettingsPageData } from "@/lib/workspace-data";

export default async function SettingsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/sign-in");
  }

  const onboardingComplete = await isOnboardingComplete(session.user.id);
  if (!onboardingComplete) {
    redirect("/setup");
  }

  const data = await getSettingsPageData(session.user.id);

  return (
    <WorkspaceShell
      page="settings"
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    >
      <WorkspaceSettingsPage data={data} />
    </WorkspaceShell>
  );
}
