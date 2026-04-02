import { redirect } from "next/navigation";

import { AuthScreen } from "@/components/auth-screen";
import { getServerSession } from "@/lib/auth-session";

export default async function SignInPage() {
  const session = await getServerSession();

  if (session) {
    redirect("/");
  }

  return <AuthScreen mode="sign-in" />;
}
