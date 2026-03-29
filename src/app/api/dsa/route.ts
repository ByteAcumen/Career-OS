import { NextResponse } from "next/server";

import { createDsaEntry } from "@/lib/dashboard";
import { dsaEntrySchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = dsaEntrySchema.parse(await request.json());
  return NextResponse.json(createDsaEntry(payload));
}
