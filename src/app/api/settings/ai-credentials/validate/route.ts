import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/auth-session";
import { rateLimit } from "@/lib/rate-limit";
import type { AiProvider } from "@/lib/types";

export const dynamic = "force-dynamic";

const ValidateRequestSchema = z.object({
  provider: z.enum(["openai", "gemini", "openrouter"]),
  apiKey: z.string().min(10).max(512),
});

// ---------------------------------------------------------------------------
// Validate AI key before saving — makes a cheap real test call to each
// provider so users know immediately if a key is wrong, expired, or invalid.
// ---------------------------------------------------------------------------
async function testProviderKey(provider: AiProvider, apiKey: string): Promise<void> {
  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401) throw new Error("Invalid OpenAI API key — authentication failed.");
    if (res.status === 429) throw new Error("OpenAI API key is valid but currently rate-limited.");
    if (!res.ok) throw new Error(`OpenAI returned ${res.status} — key may be restricted.`);
    return;
  }

  if (provider === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (res.status === 400 || res.status === 403) {
      throw new Error("Invalid Gemini API key — check Google AI Studio for a valid key.");
    }
    if (!res.ok) throw new Error(`Gemini returned ${res.status} — key may be restricted.`);
    return;
  }

  if (provider === "openrouter") {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401) {
      throw new Error("Invalid OpenRouter API key — authentication failed.");
    }
    if (!res.ok) throw new Error(`OpenRouter returned ${res.status} — key may be restricted.`);
    return;
  }
}

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Strict rate limit — key validation makes real external API calls
  const retryAfterSeconds = rateLimit(request, `validate-key:${session.user.id}`, {
    limit: 5,
    windowMs: 60_000,
  });

  if (retryAfterSeconds) {
    return NextResponse.json(
      { ok: false, error: `Too many validation attempts. Try again in ${retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = ValidateRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { provider, apiKey } = parsed.data;

  try {
    await testProviderKey(provider, apiKey.trim());
    return NextResponse.json({ ok: true, provider, message: "API key is valid ✓" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Key validation failed.";
    return NextResponse.json({ ok: false, provider, error: message }, { status: 422 });
  }
}
