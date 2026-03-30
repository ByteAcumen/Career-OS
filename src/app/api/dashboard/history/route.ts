import { NextResponse } from "next/server";

import { getDailyDetail } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ ok: false, message: "Invalid date parameter." }, { status: 400 });
  }

  const detail = getDailyDetail(dateStr);
  if (!detail) {
    return NextResponse.json({ ok: false, message: "Date not found in history." }, { status: 404 });
  }

  return NextResponse.json(detail);
}
