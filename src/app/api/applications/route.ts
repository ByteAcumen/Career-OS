import { NextResponse } from "next/server";

import { createApplicationEntry } from "@/lib/dashboard";
import { applicationEntrySchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = applicationEntrySchema.parse(await request.json());
  return NextResponse.json(createApplicationEntry(payload));
}
