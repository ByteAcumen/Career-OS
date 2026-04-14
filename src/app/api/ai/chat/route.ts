import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth-session";
import {
  buildChatContext,
  streamChat,
  AiError,
  planAssistantActions,
  type AssistantAction,
} from "@/lib/ai";
import {
  createApplicationEntry,
  createBuildEntry,
  createDsaEntry,
  createPlannerTask,
  getDashboardData,
  saveReview,
  saveSettings,
} from "@/lib/dashboard";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type AppliedAction = {
  type: AssistantAction["type"];
  summary: string;
};

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

function looksLikeActionRequest(message: string) {
  return /\b(add|create|log|save|set|update|change|plan|schedule|record|track)\b/i.test(
    message,
  );
}

function createTextStream(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

async function applyAssistantActions(
  userId: string,
  dateKey: string,
  actions: AssistantAction[],
): Promise<AppliedAction[]> {
  const applied: AppliedAction[] = [];

  for (const action of actions) {
    if (action.type === "create_task") {
      await createPlannerTask(userId, {
        title: action.title,
        details: action.details ?? "",
        scope: action.scope,
        category: action.category,
        priority: action.priority,
        estimateMinutes: action.estimateMinutes,
        targetDateKey: action.scope === "daily" ? action.targetDateKey ?? dateKey : null,
      });
      applied.push({
        type: action.type,
        summary: `Added a ${action.scope} task: ${action.title}.`,
      });
      continue;
    }

    if (action.type === "save_review") {
      await saveReview(userId, dateKey, action.note ?? "", action.tomorrowTask ?? "");
      applied.push({
        type: action.type,
        summary: action.tomorrowTask
          ? `Updated the daily review and saved tomorrow's first task as "${action.tomorrowTask}".`
          : "Updated the daily review note.",
      });
      continue;
    }

    if (action.type === "update_settings") {
      await saveSettings(userId, action.settings);
      applied.push({
        type: action.type,
        summary: `Updated workspace settings: ${Object.keys(action.settings).join(", ")}.`,
      });
      continue;
    }

    if (action.type === "log_dsa") {
      await createDsaEntry(userId, {
        dateKey: action.dateKey ?? dateKey,
        title: action.title,
        difficulty: action.difficulty,
        pattern: action.pattern,
        insight: action.insight,
        repositoryUrl: action.repositoryUrl,
      });
      applied.push({
        type: action.type,
        summary: `Logged DSA work: ${action.title}.`,
      });
      continue;
    }

    if (action.type === "log_build") {
      await createBuildEntry(userId, {
        dateKey: action.dateKey ?? dateKey,
        title: action.title,
        area: action.area,
        proof: action.proof,
        impact: action.impact,
        repositoryUrl: action.repositoryUrl,
      });
      applied.push({
        type: action.type,
        summary: `Logged build work: ${action.title}.`,
      });
      continue;
    }

    if (action.type === "log_application") {
      await createApplicationEntry(userId, {
        dateKey: action.dateKey ?? dateKey,
        company: action.company,
        role: action.role,
        status: action.status,
        note: action.note,
        roleUrl: action.roleUrl,
      });
      applied.push({
        type: action.type,
        summary: `Logged application: ${action.role} at ${action.company}.`,
      });
    }
  }

  return applied;
}

function buildAppliedActionSummary(applied: AppliedAction[]) {
  return applied.map((action) => `- ${action.summary}`).join("\n");
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

    let dashboard = await getDashboardData(session.user.id, undefined, {
      includeGithubActivity: false,
      includeIntegrations: false,
      includePreviousDay: false,
    });
    const latestUserMessage =
      [...messages].reverse().find((message) => message.role === "user")?.content ?? "";

    let appliedActions: AppliedAction[] = [];
    let appliedSummary = "";

    if (latestUserMessage && looksLikeActionRequest(latestUserMessage)) {
      try {
        const actionPlan = await planAssistantActions({
          userId: session.user.id,
          dashboard,
          messages,
          preferredProvider: dashboard.settings.aiProvider,
          configuredModel: dashboard.settings.openAiModel,
        });

        if (actionPlan.shouldAct && actionPlan.actions.length > 0) {
          appliedActions = await applyAssistantActions(
            session.user.id,
            dashboard.today.dateKey,
            actionPlan.actions,
          );

          if (appliedActions.length > 0) {
            dashboard = await getDashboardData(session.user.id, undefined, {
              includeGithubActivity: false,
              includeIntegrations: false,
              includePreviousDay: false,
            });
            appliedSummary = buildAppliedActionSummary(appliedActions);
          }
        }
      } catch (error) {
        console.warn("[AI] action planning failed:", error);
      }
    }

    const contextStr = [
      buildChatContext(dashboard),
      appliedSummary ? `Recent assistant actions:\n${appliedSummary}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
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
          "x-ai-actions-applied": appliedActions.length ? "true" : "false",
        },
      });
    } catch (error) {
      if (appliedActions.length && error instanceof AiError) {
        return new Response(
          createTextStream(
            `I updated your workspace.\n\n${appliedSummary}\n\nI could not finish the AI reply because ${error.userMessage}`,
          ),
          {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              "x-ai-provider": "actions-only",
              "x-ai-model": "local",
              "x-ai-actions-applied": "true",
            },
          },
        );
      }

      throw error;
    }

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
