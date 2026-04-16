import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestSession } from "@/lib/auth-session";
import {
  appendAssistantConversationMessage,
  buildAssistantContext,
  buildRuleBasedAssistantReply,
  ensureAssistantConversation,
  normalizeAssistantPage,
} from "@/lib/assistant";
import {
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
import { assistantContextPages } from "@/lib/types";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Request schema — validates body before any business logic runs
// ---------------------------------------------------------------------------
const ChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
  conversationId: z.string().min(8).max(120).optional(),
  page: z.enum(assistantContextPages).optional(),
});

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
  return /\b(add|create|log|save|set|update|change|plan|schedule|record|track)\b/i.test(message);
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

function createPersistedStream(
  source: ReadableStream<Uint8Array>,
  onComplete: (content: string) => Promise<void>,
) {
  const reader = source.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          if (!value) {
            continue;
          }

          fullText += decoder.decode(value, { stream: true });
          controller.enqueue(value);
        }

        fullText += decoder.decode();

        if (fullText.trim()) {
          await onComplete(fullText);
        }

        controller.close();
      } catch (error) {
        if (fullText.trim()) {
          await onComplete(fullText);
        }

        controller.error(error);
      }
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
    const rawBody = await request.json();
    const parsed = ChatRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { messages, conversationId, page } = parsed.data;
    const pageContext = normalizeAssistantPage(page);

    let dashboard = await getDashboardData(session.user.id, undefined, {
      includeGithubActivity: false,
      includeIntegrations: false,
      includePreviousDay: false,
    });

    const latestUserMessage =
      [...messages].reverse().find((message) => message.role === "user")?.content ?? "";

    let appliedActions: AppliedAction[] = [];
    let appliedSummary = "";
    const conversation = await ensureAssistantConversation(
      session.user.id,
      conversationId,
      pageContext,
    );

    if (latestUserMessage) {
      await appendAssistantConversationMessage({
        userId: session.user.id,
        conversationId: conversation.id,
        pageContext,
        role: "user",
        content: latestUserMessage,
      });
    }

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
            // Only re-fetch if actions were applied. Skip recent entries (dsa/builds/apps)
            // for task/review/settings actions — they didn't change those tables.
            // This avoids a second full 13-query getDashboardData round-trip.
            const needsFullRefresh = appliedActions.some(
              (a) =>
                a.type === "log_dsa" || a.type === "log_build" || a.type === "log_application",
            );
            dashboard = await getDashboardData(session.user.id, undefined, {
              includeGithubActivity: false,
              includeIntegrations: false,
              includePreviousDay: false,
              includeRecentEntries: needsFullRefresh,
            });
            appliedSummary = buildAppliedActionSummary(appliedActions);
          }
        }
      } catch (error) {
        console.warn("[AI] action planning failed:", error);
      }
    }

    const localReply = buildRuleBasedAssistantReply({
      dashboard,
      pageContext,
      latestUserMessage,
      appliedSummary,
    });

    if (localReply) {
      await appendAssistantConversationMessage({
        userId: session.user.id,
        conversationId: conversation.id,
        pageContext,
        role: "assistant",
        content: localReply,
      });

      return new Response(createTextStream(localReply), {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "x-ai-provider": "local",
          "x-ai-model": "rule-based",
          "x-ai-actions-applied": appliedActions.length ? "true" : "false",
          "x-ai-conversation-id": conversation.id,
        },
      });
    }

    const contextStr = [
      buildAssistantContext(dashboard, pageContext),
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

      return new Response(
        createPersistedStream(result.stream, async (content) => {
          await appendAssistantConversationMessage({
            userId: session.user.id,
            conversationId: conversation.id,
            pageContext,
            role: "assistant",
            content,
          });
        }),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "x-ai-provider": result.provider,
            "x-ai-model": result.model,
            "x-ai-actions-applied": appliedActions.length ? "true" : "false",
            "x-ai-conversation-id": conversation.id,
          },
        },
      );
    } catch (error) {
      const localFallback = appliedActions.length
        ? [
            `I updated your workspace.\n\n${appliedSummary}`,
            error instanceof AiError
              ? `AI reply skipped because ${error.userMessage}`
              : "AI reply skipped because the provider was unavailable.",
          ]
            .filter(Boolean)
            .join("\n\n")
        : null;

      if (localFallback) {
        await appendAssistantConversationMessage({
          userId: session.user.id,
          conversationId: conversation.id,
          pageContext,
          role: "assistant",
          content: localFallback,
        });

        return new Response(createTextStream(localFallback), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "x-ai-provider": "actions-only",
            "x-ai-model": "local",
            "x-ai-actions-applied": "true",
            "x-ai-conversation-id": conversation.id,
          },
        });
      }

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
              "x-ai-conversation-id": conversation.id,
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

    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
