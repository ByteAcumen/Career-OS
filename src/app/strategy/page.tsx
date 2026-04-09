export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { WorkspaceStrategyPage } from "@/components/workspace/strategy-page";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getServerSession } from "@/lib/auth-session";
import { getStrategyPageData } from "@/lib/workspace-data";

export default async function StrategyPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/sign-in");
  }

  const data = await getStrategyPageData(session.user.id);

  return (
    <WorkspaceShell
      page="strategy"
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    >
      <WorkspaceStrategyPage data={data} />
    </WorkspaceShell>
  );
}
