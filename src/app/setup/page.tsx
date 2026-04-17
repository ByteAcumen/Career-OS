export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { SetupOnboardingScreen } from "@/components/setup-onboarding-screen";
import { getServerSession } from "@/lib/auth-session";
import { getDashboardData } from "@/lib/dashboard";
import { getMissingOnboardingFields, getOnboardingFieldLabels } from "@/lib/onboarding";

export default async function SetupPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/sign-in");
  }

  const dashboard = await getDashboardData(session.user.id);

  if (dashboard.settings.onboardingCompleted) {
    redirect("/home");
  }

  const missingFieldKeys = getMissingOnboardingFields(dashboard.settings);

  return (
    <SetupOnboardingScreen
      currentUser={{
        name: session.user.name,
        email: session.user.email,
      }}
      initialSettings={{
        primaryGoal: dashboard.settings.primaryGoal,
        targetRole: dashboard.settings.targetRole,
        university: dashboard.settings.university,
        degree: dashboard.settings.degree,
        graduationYear: dashboard.settings.graduationYear,
        planStyle: dashboard.settings.planStyle,
        linkedinUrl: dashboard.settings.linkedinUrl,
        jobTrackerUrl: dashboard.settings.jobTrackerUrl,
        githubUrl: dashboard.settings.githubUrl,
        leetcodeUrl: dashboard.settings.leetcodeUrl,
        portfolioUrl: dashboard.settings.portfolioUrl,
        resumeUrl: dashboard.settings.resumeUrl,
        customAiInstructions: dashboard.settings.customAiInstructions,
        aiProvider: dashboard.settings.aiProvider,
      }}
      missingFieldLabels={getOnboardingFieldLabels(missingFieldKeys)}
      savedApiKeys={dashboard.integrations.savedApiKeys}
      providerSources={dashboard.integrations.providerSources}
    />
  );
}

