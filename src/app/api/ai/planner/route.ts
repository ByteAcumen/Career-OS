import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth-session";
import { generatePlannerSuggestionPack } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const retryAfterSeconds = rateLimit(request, `ai-planner:${session.user.id}`, {
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
    const suggestions = await generatePlannerSuggestionPack(session.user.id);
    return NextResponse.json({ ok: true, suggestions });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "AI planner failed",
      },
      { status: 500 },
    );
  }
}
