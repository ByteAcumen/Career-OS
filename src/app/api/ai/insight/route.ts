import { NextResponse } from "next/server";

import { generateInsight } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  type: z.enum(["dsa", "build"]),
  title: z.string(),
  context: z.string().optional().default(""),
});

export async function POST(request: Request) {
  const retryAfterSeconds = rateLimit(request, "ai-insight", {
    limit: 20,
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
    const body = await request.json();
    const payload = inputSchema.parse(body);
    const insight = await generateInsight(payload.type, payload.title, payload.context);
    return NextResponse.json({ ok: true, insight });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "AI insight failed",
      },
      { status: 500 },
    );
  }
}
