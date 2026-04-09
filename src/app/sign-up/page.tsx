import { redirect } from "next/navigation";

import { AuthScreen } from "@/components/auth-screen";
import { getServerSession } from "@/lib/auth-session";
import { getEnvValue } from "@/lib/env";

export default async function SignUpPage() {
  const session = await getServerSession();

  if (session) {
    redirect("/");
  }

  const googleEnabled = Boolean(
    getEnvValue("GOOGLE_CLIENT_ID") && getEnvValue("GOOGLE_CLIENT_SECRET"),
  );

  return <AuthScreen mode="sign-up" googleEnabled={googleEnabled} />;
}
