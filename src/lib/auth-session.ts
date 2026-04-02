import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export type AppSession = NonNullable<Awaited<ReturnType<typeof getServerSession>>>;

export async function getServerSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function getRequestSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}
