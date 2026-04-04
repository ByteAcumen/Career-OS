import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth-session";
import { getDailyDetail } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ ok: false, message: "Invalid date parameter." }, { status: 400 });
  }

  const detail = await getDailyDetail(session.user.id, dateStr);
  if (!detail) {
    return NextResponse.json({ ok: false, message: "Date not found in history." }, { status: 404 });
  }

  return NextResponse.json(detail);
}
