import { NextResponse } from "next/server";

import { buildResumeFileName } from "@/features/resume/file-name";
import { generateResumeDraftForUser } from "@/features/resume/generate-resume";
import {
  readResumeGenerationRequest,
  ResumeRequestValidationError,
} from "@/features/resume/read-request";
import { getRequestSession } from "@/lib/auth-session";
import { getDashboardData } from "@/lib/dashboard";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const dashboardOptions = {
  includeGithubActivity: false,
  includeIntegrations: false,
  includePreviousDay: false,
};

async function buildResumeResponse(
  request: Request,
  input: Parameters<typeof generateResumeDraftForUser>[0]["input"],
  upload: Parameters<typeof generateResumeDraftForUser>[0]["upload"],
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
  const result = await generateResumeDraftForUser({
    userId: session.user.id,
    dashboard,
    user: {
      name: session.user.name,
      email: session.user.email,
    },
    input,
    upload,
  });

  return NextResponse.json({
    ok: true,
    resume: result.resume,
    optimizedWithAi: result.optimizedWithAi,
    upload: result.upload
      ? {
          fileName: result.upload.fileName,
          format: result.upload.format,
          contentType: result.upload.contentType,
          sizeBytes: result.upload.sizeBytes,
          extractedCharacterCount: result.upload.extractedCharacterCount,
          totalPages: result.upload.totalPages,
          detectedLinks: result.upload.detectedLinks,
          detectedSections: result.upload.detectedSections,
          warnings: result.upload.warnings,
        }
      : null,
    downloads: {
      markdownFileName: buildResumeFileName({
        userName: result.resume.header.name,
        company: result.resume.company,
        targetRole: result.resume.targetRole,
        extension: "md",
      }),
      latexFileName: buildResumeFileName({
        userName: result.resume.header.name,
        company: result.resume.company,
        targetRole: result.resume.targetRole,
        extension: "tex",
      }),
      pdfFileName: buildResumeFileName({
        userName: result.resume.header.name,
        company: result.resume.company,
        targetRole: result.resume.targetRole,
        extension: "pdf",
      }),
    },
  });
}

export async function GET(request: Request) {
  return buildResumeResponse(request, {}, null);
}

export async function POST(request: Request) {
  try {
    const { input, upload } = await readResumeGenerationRequest(request);
    return buildResumeResponse(request, input, upload);
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
        message: error instanceof Error ? error.message : "Unable to process the resume request.",
      },
      { status: 400 },
    );
  }
}
