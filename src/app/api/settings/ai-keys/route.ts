import { NextResponse } from "next/server";

import { deleteAiCredential, saveAiCredential } from "@/lib/ai-credentials";
import { getRequestSession } from "@/lib/auth-session";
import { rateLimit } from "@/lib/rate-limit";
import { aiKeyDeleteSchema, aiKeySchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  // Security Check: Enforce user-level isolation.
  // The rate limit key and database writes are strictly bound to this session's user ID.
  const userId = session.user.id;

  const retryAfterSeconds = rateLimit(request, `ai-keys:${userId}`, {
    limit: 12,
    windowMs: 60_000,
  });

  if (retryAfterSeconds) {
    return NextResponse.json(
      {
        ok: false,
        message: `Too many credential changes. Try again in ${retryAfterSeconds} seconds.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const payload = aiKeySchema.parse(await request.json());
  await saveAiCredential(userId, payload.provider, payload.apiKey);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const retryAfterSeconds = rateLimit(request, `ai-keys:${session.user.id}`, {
    limit: 12,
    windowMs: 60_000,
  });

  if (retryAfterSeconds) {
    return NextResponse.json(
      {
        ok: false,
        message: `Too many credential changes. Try again in ${retryAfterSeconds} seconds.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const payload = aiKeyDeleteSchema.parse(await request.json());
  await deleteAiCredential(session.user.id, payload.provider);

  return NextResponse.json({ ok: true });
}
