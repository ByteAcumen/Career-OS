import { NextResponse } from "next/server";

import { createBuildEntry } from "@/lib/dashboard";
import { buildEntrySchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = buildEntrySchema.parse(await request.json());
  return NextResponse.json(createBuildEntry(payload));
}
