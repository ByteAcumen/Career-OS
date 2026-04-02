import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth-session";
import { createBuildEntry } from "@/lib/dashboard";
import { buildEntrySchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const payload = buildEntrySchema.parse(await request.json());
  return NextResponse.json(createBuildEntry(session.user.id, payload));
}
