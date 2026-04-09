export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth-session";
import { LandingPage } from "@/components/landing-page";

export default async function Home() {
  const session = await getServerSession();

  if (!session) {
    return <LandingPage />;
  }

  redirect("/home");
}
