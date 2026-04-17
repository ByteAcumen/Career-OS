export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth-session";
import { isOnboardingComplete } from "@/lib/onboarding";
import { LandingPage } from "@/components/landing-page";

export default async function Home() {
  const session = await getServerSession();

  if (!session) {
    return <LandingPage />;
  }

  const onboardingComplete = await isOnboardingComplete(session.user.id);
  redirect(onboardingComplete ? "/home" : "/setup");
}
