import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth-session";
import { generateInsight, AiError } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  type: z.enum(["dsa", "build"]),
  title: z.string(),
  context: z.string().optional().default(""),
});

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const retryAfterSeconds = rateLimit(request, "ai-insight", {
    limit: 20,
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
    const body = await request.json();
    const payload = inputSchema.parse(body);
    const insight = await generateInsight(
      session.user.id,
      payload.type,
      payload.title,
      payload.context,
    );
    return NextResponse.json({ ok: true, insight });
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
        message: error instanceof Error ? error.message : "AI insight failed",
      },
      { status: 500 },
    );
  }
}
