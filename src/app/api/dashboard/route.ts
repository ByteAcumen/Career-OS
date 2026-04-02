import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth-session";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetDateMode = searchParams.get("date") ?? undefined;

  const data = await getDashboardData(session.user.id, targetDateMode);
  return NextResponse.json(data);
}
