import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth-session";
import { saveSettings } from "@/lib/dashboard";
import { rateLimit } from "@/lib/rate-limit";
import { settingsSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const retryAfterSeconds = rateLimit(request, `settings:${session.user.id}`, {
    limit: 30,
    windowMs: 60_000,
  });

  if (retryAfterSeconds) {
    return NextResponse.json(
      {
        ok: false,
        message: `Too many settings updates. Try again in ${retryAfterSeconds} seconds.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const payload = settingsSchema.parse(await request.json());
  return NextResponse.json(saveSettings(session.user.id, payload));
}
