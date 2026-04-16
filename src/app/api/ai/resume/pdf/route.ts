import { Buffer } from "node:buffer";

import { NextResponse } from "next/server";

import { ResumeDraftSchema, ResumeRequestSchema } from "@/features/resume/contracts";
import { buildResumeFileName } from "@/features/resume/file-name";
import { generateResumeDraftForUser } from "@/features/resume/generate-resume";
import {
  readResumeGenerationRequest,
  ResumeRequestValidationError,
} from "@/features/resume/read-request";
import { renderResumePdf } from "@/features/resume/render-resume-pdf";
import { getRequestSession } from "@/lib/auth-session";
import { getDashboardData } from "@/lib/dashboard";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const dashboardOptions = {
  includeGithubActivity: false,
  includeIntegrations: false,
  includePreviousDay: false,
};

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const retryAfterSeconds = rateLimit(request, `ai-resume-pdf:${session.user.id}`, {
    limit: 6,
    windowMs: 60_000,
  });

  if (retryAfterSeconds) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        message: `Too many PDF exports. Try again in ${retryAfterSeconds} seconds.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let resume;

    if (contentType.includes("application/json")) {
      const rawBody = await request.json().catch(() => ({}));
      const parsed = ResumeDraftSchema.safeParse(rawBody?.resume);

      if (parsed.success) {
        resume = parsed.data;
      } else {
        const inputParsed = ResumeRequestSchema.safeParse(rawBody ?? {});
        if (!inputParsed.success) {
          throw new ResumeRequestValidationError(inputParsed.error.flatten());
        }

        const dashboard = await getDashboardData(session.user.id, undefined, dashboardOptions);
        const generated = await generateResumeDraftForUser({
          userId: session.user.id,
          dashboard,
          user: {
            name: session.user.name,
            email: session.user.email,
          },
          input: inputParsed.data,
          upload: null,
        });
        resume = generated.resume;
      }
    } else {
      const { input, upload } = await readResumeGenerationRequest(request);
      const dashboard = await getDashboardData(session.user.id, undefined, dashboardOptions);
      const generated = await generateResumeDraftForUser({
        userId: session.user.id,
        dashboard,
        user: {
          name: session.user.name,
          email: session.user.email,
        },
        input,
        upload,
      });
      resume = generated.resume;
    }

    const pdfBytes = await renderResumePdf(resume);
    const fileName = buildResumeFileName({
      userName: resume.header.name,
      company: resume.company,
      targetRole: resume.targetRole,
      extension: "pdf",
    });

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ResumeRequestValidationError) {
      return NextResponse.json(
        { ok: false, message: error.message, details: error.flattened },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to export resume PDF.",
      },
      { status: 400 },
    );
  }
}
