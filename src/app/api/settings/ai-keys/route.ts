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

  const payload = aiKeySchema.parse(await request.json());
  saveAiCredential(session.user.id, payload.provider, payload.apiKey);

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
  deleteAiCredential(session.user.id, payload.provider);

  return NextResponse.json({ ok: true });
}
