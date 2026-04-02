import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth-session";
import { createDsaEntry } from "@/lib/dashboard";
import { dsaEntrySchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const payload = dsaEntrySchema.parse(await request.json());
  return NextResponse.json(createDsaEntry(session.user.id, payload));
}
