import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth-session";
import { generateCoachResponse } from "@/lib/ai";
import { saveCoachResponse } from "@/lib/dashboard";
import { rateLimit } from "@/lib/rate-limit";
import { toDateKey } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const retryAfterSeconds = rateLimit(request, "ai-coach", {
    limit: 8,
    windowMs: 60_000,
  });

  if (retryAfterSeconds) {
    return NextResponse.json(
      {
        ok: false,
        message: `Too many AI requests. Try again in ${retryAfterSeconds} seconds.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  try {
    const coach = await generateCoachResponse(session.user.id);
    saveCoachResponse(session.user.id, toDateKey(), coach);

    return NextResponse.json({ ok: true, coach });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "AI coach failed",
      },
      { status: 500 },
    );
  }
}
