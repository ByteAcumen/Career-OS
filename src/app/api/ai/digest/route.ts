import { NextResponse } from "next/server";

import { buildWeeklyDigest } from "@/features/digest/build-weekly-digest";
import { getConfiguredAppBaseUrl } from "@/lib/app-url";
import { getRequestSession } from "@/lib/auth-session";
import { getDashboardData } from "@/lib/dashboard";
import { sendWeeklyDigestEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const dashboardOptions = {
  includeGithubActivity: false,
  includeIntegrations: false,
  includePreviousDay: false,
};

async function generateDigest(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return { error: NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 }) };
  }

  const retryAfterSeconds = rateLimit(request, `ai-digest:${session.user.id}`, {
    limit: 6,
    windowMs: 60_000,
  });

  if (retryAfterSeconds) {
    return {
      error: NextResponse.json(
        {
          ok: false,
          code: "RATE_LIMITED",
          message: `Too many digest requests. Try again in ${retryAfterSeconds} seconds.`,
        },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
      ),
    };
  }

  const dashboard = await getDashboardData(session.user.id, undefined, dashboardOptions);
  const digest = buildWeeklyDigest(dashboard, {
    user: {
      name: session.user.name,
      email: session.user.email,
    },
    appUrl: `${getConfiguredAppBaseUrl()}/home`,
  });

  return { session, digest };
}

export async function GET(request: Request) {
  const result = await generateDigest(request);
  if ("error" in result) {
    return result.error;
  }

  return NextResponse.json({ ok: true, digest: result.digest });
}

export async function POST(request: Request) {
  const result = await generateDigest(request);
  if ("error" in result) {
    return result.error;
  }

  if (!result.session.user.email) {
    return NextResponse.json(
      { ok: false, message: "No email is available for this account." },
      { status: 400 },
    );
  }

  await sendWeeklyDigestEmail(result.session.user.email, result.digest);

  return NextResponse.json({
    ok: true,
    deliveredTo: result.session.user.email,
    subject: result.digest.subject,
  });
}
