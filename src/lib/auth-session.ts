import { headers } from "next/headers";

import { auth, ensureAuthTables } from "@/lib/auth";

export type AppSession = NonNullable<Awaited<ReturnType<typeof getServerSession>>>;

export async function getServerSession() {
  await ensureAuthTables();
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function getRequestSession(request: Request) {
  await ensureAuthTables();
  return auth.api.getSession({
    headers: request.headers,
  });
}
