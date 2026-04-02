import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth-session";
import { saveSettings } from "@/lib/dashboard";
import { settingsSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const payload = settingsSchema.parse(await request.json());
  return NextResponse.json(saveSettings(session.user.id, payload));
}
