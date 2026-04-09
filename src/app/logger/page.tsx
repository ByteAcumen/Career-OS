export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { WorkspaceLoggerPage } from "@/components/workspace/logger-page";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getServerSession } from "@/lib/auth-session";
import { getLoggerPageData } from "@/lib/workspace-data";

export default async function LoggerPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/sign-in");
  }

  const data = await getLoggerPageData(session.user.id);

  return (
    <WorkspaceShell
      page="logger"
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    >
      <WorkspaceLoggerPage data={data} />
    </WorkspaceShell>
  );
}
