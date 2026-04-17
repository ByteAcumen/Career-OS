export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { ResumeBuilder } from "@/components/resume-builder";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getServerSession } from "@/lib/auth-session";

export default async function ResumePage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <WorkspaceShell
      page="resume"
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    >
      <ResumeBuilder
        userName={session.user.name}
        userEmail={session.user.email}
      />
    </WorkspaceShell>
  );
}
