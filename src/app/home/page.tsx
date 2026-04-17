export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { WorkspaceHomePage } from "@/components/workspace/home-page";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getServerSession } from "@/lib/auth-session";
import { isOnboardingComplete } from "@/lib/onboarding";
import { getHomePageData } from "@/lib/workspace-data";

export default async function HomePage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/sign-in");
  }

  const onboardingComplete = await isOnboardingComplete(session.user.id);
  if (!onboardingComplete) {
    redirect("/setup");
  }

  const data = await getHomePageData(session.user.id);

  return (
    <WorkspaceShell
      page="home"
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    >
      <WorkspaceHomePage data={data} />
    </WorkspaceShell>
  );
}
