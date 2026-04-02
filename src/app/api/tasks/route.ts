import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth-session";
import {
  createPlannerTask,
  deletePlannerTask,
  updatePlannerTaskStatus,
} from "@/lib/dashboard";
import { rateLimit } from "@/lib/rate-limit";
import {
  plannerTaskCreateSchema,
  plannerTaskDeleteSchema,
  plannerTaskUpdateSchema,
} from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const retryAfterSeconds = rateLimit(request, `tasks:${session.user.id}`, {
    limit: 40,
    windowMs: 60_000,
  });

  if (retryAfterSeconds) {
    return NextResponse.json(
      {
        ok: false,
        message: `Too many task changes. Try again in ${retryAfterSeconds} seconds.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const payload = plannerTaskCreateSchema.parse(await request.json());
  return NextResponse.json(createPlannerTask(session.user.id, payload));
}

export async function PATCH(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const retryAfterSeconds = rateLimit(request, `tasks:${session.user.id}`, {
    limit: 40,
    windowMs: 60_000,
  });

  if (retryAfterSeconds) {
    return NextResponse.json(
      {
        ok: false,
        message: `Too many task changes. Try again in ${retryAfterSeconds} seconds.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const payload = plannerTaskUpdateSchema.parse(await request.json());
  return NextResponse.json(
    updatePlannerTaskStatus(session.user.id, payload.id, payload.status),
  );
}

export async function DELETE(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const retryAfterSeconds = rateLimit(request, `tasks:${session.user.id}`, {
    limit: 40,
    windowMs: 60_000,
  });

  if (retryAfterSeconds) {
    return NextResponse.json(
      {
        ok: false,
        message: `Too many task changes. Try again in ${retryAfterSeconds} seconds.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const payload = plannerTaskDeleteSchema.parse(await request.json());
  return NextResponse.json(deletePlannerTask(session.user.id, payload.id));
}
