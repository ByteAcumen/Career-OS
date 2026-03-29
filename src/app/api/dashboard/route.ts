import { NextResponse } from "next/server";

import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await getDashboardData();
  return NextResponse.json(data);
}
