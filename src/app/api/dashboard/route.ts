import { NextResponse } from "next/server";

import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetDateMode = searchParams.get("date") ?? undefined;
  
  const data = await getDashboardData(targetDateMode);
  return NextResponse.json(data);
}
