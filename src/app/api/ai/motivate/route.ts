import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth-session";
import { generateMotivationQuotes, AiError } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const retryAfterSeconds = rateLimit(request, "ai-motivate", {
    limit: 15,
    windowMs: 60_000,
  });

  if (retryAfterSeconds) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        message: `Too many AI requests. Try again in ${retryAfterSeconds} seconds.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  try {
    const quotes = await generateMotivationQuotes(session.user.id);
    return NextResponse.json({ ok: true, quote: quotes[0], quotes });
  } catch (error) {
    if (error instanceof AiError) {
      return NextResponse.json(
        {
          ok: false,
          code: error.code,
          provider: error.provider,
          message: error.userMessage,
          retryable: error.retryable,
        },
        { status: error.code === "NO_KEY" ? 400 : 502 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        code: "PROVIDER_ERROR",
        message: error instanceof Error ? error.message : "AI motivation failed",
      },
      { status: 500 },
    );
  }
}
