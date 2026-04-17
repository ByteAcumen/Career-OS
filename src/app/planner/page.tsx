export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { WorkspacePlannerPage } from "@/components/workspace/planner-page";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getServerSession } from "@/lib/auth-session";
import { isOnboardingComplete } from "@/lib/onboarding";
import { getPlannerPageData } from "@/lib/workspace-data";

export default async function PlannerPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/sign-in");
  }

  const onboardingComplete = await isOnboardingComplete(session.user.id);
  if (!onboardingComplete) {
    redirect("/setup");
  }

  const data = await getPlannerPageData(session.user.id);

  return (
    <WorkspaceShell
      page="planner"
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    >
      <WorkspacePlannerPage data={data} />
    </WorkspaceShell>
  );
}
