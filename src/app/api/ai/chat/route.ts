import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth-session";
import { buildChatContext, streamChat, AiError } from "@/lib/ai";
import { getDashboardData } from "@/lib/dashboard";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getAiErrorStatus(error: AiError) {
  switch (error.code) {
    case "RATE_LIMITED":
      return 429;
    case "TIMEOUT":
      return 504;
    case "PARSE_ERROR":
      return 502;
    case "INVALID_KEY":
    case "NO_KEY":
    case "QUOTA_EXCEEDED":
    case "PROVIDER_ERROR":
    default:
      return 503;
  }
}

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const retryAfterSeconds = rateLimit(request, `ai-chat:${session.user.id}`, {
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
    const messages = body.messages as Array<{ role: "user" | "assistant"; content: string }>;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("Bad Request: messages array is required", { status: 400 });
    }

    const dashboard = await getDashboardData(session.user.id, undefined, {
      includeGithubActivity: false,
      includeIntegrations: false,
      includePreviousDay: false,
    });
    const contextStr = buildChatContext(dashboard);
    const result = await streamChat(
      session.user.id,
      messages,
      contextStr,
      dashboard.settings.aiProvider,
      dashboard.settings.openAiModel,
    );

    return new Response(result.stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "x-ai-provider": result.provider,
        "x-ai-model": result.model,
      },
    });

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
        { status: getAiErrorStatus(error) },
      );
    }

    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
