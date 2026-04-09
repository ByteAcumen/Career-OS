export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { WorkspaceProgressPage } from "@/components/workspace/progress-page";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getServerSession } from "@/lib/auth-session";
import { getProgressPageData } from "@/lib/workspace-data";

export default async function ProgressPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/sign-in");
  }

  const data = await getProgressPageData(session.user.id);

  return (
    <WorkspaceShell
      page="progress"
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    >
      <WorkspaceProgressPage data={data} />
    </WorkspaceShell>
  );
}
