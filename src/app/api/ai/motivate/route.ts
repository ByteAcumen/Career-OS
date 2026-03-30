import { NextResponse } from "next/server";

import { generateMotivation } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const retryAfterSeconds = rateLimit(request, "ai-motivate", {
    limit: 15,
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
    const quote = await generateMotivation();
    return NextResponse.json({ ok: true, quote });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "AI motivation failed",
      },
      { status: 500 },
    );
  }
}
