import { NextResponse } from "next/server";
import { z } from "zod";

import { buildResumeDraft } from "@/features/resume/build-resume";
import { getRequestSession } from "@/lib/auth-session";
import { getDashboardData } from "@/lib/dashboard";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ResumeRequestSchema = z.object({
  targetRole: z.string().max(120).optional(),
  company: z.string().max(120).optional(),
  jobDescription: z.string().max(6000).optional(),
  emphasis: z.enum(["balanced", "projects", "dsa"]).optional(),
});

const dashboardOptions = {
  includeGithubActivity: false,
  includeIntegrations: false,
  includePreviousDay: false,
};

async function generateResumeForRequest(
  request: Request,
  payload: z.infer<typeof ResumeRequestSchema>,
) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const retryAfterSeconds = rateLimit(request, `ai-resume:${session.user.id}`, {
    limit: 8,
    windowMs: 60_000,
  });

  if (retryAfterSeconds) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        message: `Too many resume generations. Try again in ${retryAfterSeconds} seconds.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const dashboard = await getDashboardData(session.user.id, undefined, dashboardOptions);
  const resume = buildResumeDraft(dashboard, {
    user: {
      name: session.user.name,
      email: session.user.email,
    },
    ...payload,
  });

  return NextResponse.json({ ok: true, resume });
}

export async function GET(request: Request) {
  return generateResumeForRequest(request, {});
}

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => ({}));
  const parsed = ResumeRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid resume request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  return generateResumeForRequest(request, parsed.data);
}
