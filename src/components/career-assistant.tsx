"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  History,
  LoaderCircle,
  Maximize2,
  Minimize2,
  PenSquare,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import ReactMarkdown from "react-markdown";

import type {
  AssistantContextPage,
  AssistantConversation,
  AssistantConversationMessage,
  AssistantConversationSummary,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_CONTEXT_MESSAGES = 4;
const MAX_MESSAGE_CHARS = 1200;

const WELCOME_MESSAGE: AssistantConversationMessage = {
  id: "assistant-welcome",
  role: "assistant",
  content:
    "I can review momentum, plan the next block, add tasks, save reviews, log work, and update settings when you ask clearly. Previous chats are now saved to your account.",
  createdAt: new Date(0).toISOString(),
};

const QUICK_PROMPTS = [
  "Review my week and tell me the smallest recovery step.",
  "What should I do now based on my current page context?",
  "Help me log the work I just finished.",
  "Review my settings and tell me what to improve.",
];

function buildRequestMessages(
  messages: AssistantConversationMessage[],
  nextUserMessage: AssistantConversationMessage,
) {
  return [...messages, nextUserMessage]
    .filter((message, index) => !(index === 0 && message.role === "assistant"))
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((message) => ({
      role: message.role,
      content:
        message.content.length > MAX_MESSAGE_CHARS
          ? `${message.content.slice(0, MAX_MESSAGE_CHARS).trim()}...`
          : message.content,
    }));
}

async function readAssistantError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as {
      message?: string;
      provider?: string;
      code?: string;
    };

    if (payload.message) return payload.message;
    if (payload.provider || payload.code) {
      return [payload.provider, payload.code].filter(Boolean).join(": ");
    }
  }

  const text = await response.text();
  return text || "The assistant could not complete that request.";
}

function getLastConversationStorageKey(userId: string) {
  return `career-os:assistant:last-conversation:${userId}`;
}

function getLayoutStorageKey(userId: string) {
  return `career-os:assistant:layout:${userId}`;
}

function humanizePage(page: AssistantContextPage) {
  return `${page.charAt(0).toUpperCase()}${page.slice(1)} context`;
}

function humanizeProvider(provider: string | null) {
  switch (provider) {
    case "openai":
      return "OpenAI";
    case "gemini":
      return "Gemini";
    case "openrouter":
      return "OpenRouter";
    case "local":
      return "Local reply";
    case "actions-only":
      return "Workspace actions";
    default:
      return provider ?? "Assistant";
  }
}

function relativeTime(dateString: string) {
  const diffMinutes = Math.round((Date.now() - new Date(dateString).getTime()) / 60000);
  if (!Number.isFinite(diffMinutes) || Math.abs(diffMinutes) < 1) return "now";
  if (Math.abs(diffMinutes) < 60) return `${Math.abs(diffMinutes)}m`;

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return `${Math.abs(diffHours)}h`;

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) return `${Math.abs(diffDays)}d`;

  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(
    new Date(dateString),
  );
}



export function CareerAssistant({
  userId,
  page,
}: {
  userId: string;
  page: AssistantContextPage;
}) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [workspaceUpdated, setWorkspaceUpdated] = useState(false);
  const [conversations, setConversations] = useState<AssistantConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantConversationMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [statusText, setStatusText] = useState(
    "Focused on the current page to keep replies fast and lean.",
  );
  const [providerText, setProviderText] = useState("Focused mode");

  const canShowHistory = expanded && showHistory;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    try {
      const raw = window.localStorage.getItem(getLayoutStorageKey(userId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { expanded?: boolean };
      setExpanded(Boolean(parsed.expanded));
    } catch {
      // Ignore invalid local layout state.
    }
  }, [mounted, userId]);

  useEffect(() => {
    if (!mounted) return;

    try {
      window.localStorage.setItem(getLayoutStorageKey(userId), JSON.stringify({ expanded }));
    } catch {
      // Ignore storage failures.
    }
  }, [expanded, mounted, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming, loadingConversation]);

  const openConversation = useCallback(async (conversationId: string) => {
    setLoadingConversation(true);
    setWorkspaceUpdated(false);
    setStatusText("Loading saved conversation...");

    try {
      const response = await fetch(`/api/ai/chat/conversations/${conversationId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(await readAssistantError(response));
      }

      const payload = (await response.json()) as { conversation: AssistantConversation };
      setMessages(payload.conversation.messages.length ? payload.conversation.messages : [WELCOME_MESSAGE]);
      setActiveConversationId(payload.conversation.id);
      setProviderText(`${humanizePage(payload.conversation.pageContext)} loaded`);
      setStatusText("Saved messages restored from your private workspace history.");

      try {
        window.localStorage.setItem(getLastConversationStorageKey(userId), payload.conversation.id);
      } catch {
        // Ignore storage failures.
      }
    } finally {
      setLoadingConversation(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!open || bootstrapped || !mounted) return;

    const run = async () => {
      setLoadingHistory(true);

      try {
        const summaries = await fetchConversationSummaries();
        setConversations(summaries);

        const storedConversationId = window.localStorage.getItem(getLastConversationStorageKey(userId));
        const targetConversationId =
          storedConversationId && summaries.some((item) => item.id === storedConversationId)
            ? storedConversationId
            : summaries[0]?.id ?? null;

        if (targetConversationId) {
          await openConversation(targetConversationId);
        }
      } finally {
        setLoadingHistory(false);
        setBootstrapped(true);
      }
    };

    void run();
  }, [bootstrapped, mounted, open, openConversation, userId]);

  async function fetchConversationSummaries() {
    const response = await fetch("/api/ai/chat/conversations", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(await readAssistantError(response));
    }

    const payload = (await response.json()) as {
      conversations: AssistantConversationSummary[];
    };

    return payload.conversations ?? [];
  }

  async function refreshConversationSummaries(nextActiveId?: string | null) {
    const summaries = await fetchConversationSummaries();
    setConversations(summaries);

    const value = nextActiveId ?? activeConversationId;
    if (value) {
      try {
        window.localStorage.setItem(getLastConversationStorageKey(userId), value);
      } catch {
        // Ignore storage failures.
      }
    }

    return summaries;
  }

  function toggleHistory() {
    setShowHistory((current) => {
      const next = !current;
      if (next) {
        setExpanded(true);
      }
      return next;
    });
  }

  function toggleExpanded() {
    setExpanded((current) => {
      const next = !current;
      if (!next) {
        setShowHistory(false);
      }
      return next;
    });
  }

  function closeAssistant() {
    setShowHistory(false);
    setOpen(false);
  }

  async function deleteConversation(e: React.MouseEvent, targetId: string) {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation permanently?")) return;

    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/ai/chat/conversations/${targetId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        if (targetId === activeConversationId) {
          startFreshConversation();
        } else {
          await refreshConversationSummaries();
        }
      }
    } finally {
      setLoadingHistory(false);
    }
  }

  function startFreshConversation() {
    setActiveConversationId(null);
    setMessages([WELCOME_MESSAGE]);
    setInput("");
    setWorkspaceUpdated(false);
    setProviderText("Focused mode");
    setStatusText("Starting a fresh conversation with the current page context.");

    try {
      window.localStorage.removeItem(getLastConversationStorageKey(userId));
    } catch {
      // Ignore storage failures.
    }
  }

  async function sendCurrentMessage() {
    if (!input.trim() || streaming || loadingConversation) return;

    const userMessage: AssistantConversationMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };
    const assistantMessageId = crypto.randomUUID();

    setMessages((current) => [
      ...current,
      userMessage,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      },
    ]);
    setInput("");
    setStreaming(true);
    setWorkspaceUpdated(false);
    setStatusText("Thinking with focused workspace context...");

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: buildRequestMessages(messages, userMessage),
          conversationId: activeConversationId ?? undefined,
          page,
        }),
      });

      if (!response.ok) {
        throw new Error(await readAssistantError(response));
      }

      if (!response.body) {
        throw new Error("The assistant did not return a response stream.");
      }

      const nextConversationId = response.headers.get("x-ai-conversation-id");
      const provider = response.headers.get("x-ai-provider");
      const model = response.headers.get("x-ai-model");
      const actionsApplied = response.headers.get("x-ai-actions-applied") === "true";

      if (nextConversationId) {
        setActiveConversationId(nextConversationId);

        try {
          window.localStorage.setItem(getLastConversationStorageKey(userId), nextConversationId);
        } catch {
          // Ignore storage failures.
        }
      }

      setProviderText(
        provider ? `${humanizeProvider(provider)}${model ? ` / ${model}` : ""}` : "Assistant reply",
      );
      setStatusText(
        provider === "local"
          ? "Using a faster local workspace reply to reduce API usage."
          : "Streaming from the active provider with fallback available.",
      );

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        currentText += decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessageId ? { ...message, content: currentText } : message,
          ),
        );
      }

      if (actionsApplied) {
        setWorkspaceUpdated(true);
        router.refresh();
      }

      await refreshConversationSummaries(nextConversationId ?? activeConversationId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The assistant could not complete that request.";

      setMessages((current) =>
        current.map((entry) =>
          entry.id === assistantMessageId ? { ...entry, content: message } : entry,
        ),
      );
      setProviderText("Assistant issue");
      setStatusText("The assistant hit a provider or network problem. Your saved chats are still safe.");
    } finally {
      setStreaming(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[75] sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {!open ? (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            onClick={() => setOpen(true)}
            className="pointer-events-auto inline-flex items-center gap-3 rounded-full border border-white/10 bg-[rgba(10,10,10,0.85)] px-3 py-3 text-sm font-medium text-white shadow-[0_8px_32px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:px-4 transition-transform hover:scale-105"
          >
            <div className="relative flex size-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/6">
              <Bot className="size-4 text-white" />
              <span className="absolute bottom-[7px] right-[7px] size-2 rounded-full bg-white" />
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-sm font-semibold text-white">AI assistant</div>
              <div className="text-[11px] text-white/48">{humanizePage(page)} / saved history</div>
            </div>
          </motion.button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 24, scale: 0.96, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className={cn(
              "pointer-events-auto overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(12,12,12,0.85)] shadow-[0_40px_110px_-20px_rgba(0,0,0,0.98)] backdrop-blur-2xl ring-1 ring-white/5",
              expanded
                ? "h-[min(88vh,760px)] w-[min(96vw,1000px)]"
                : "h-[min(84vh,720px)] w-[min(96vw,560px)]",
            )}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-[18px] border border-white/[0.08] bg-white/[0.05]">
                    <Bot className="size-4.5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">Career AI Assistant</div>
                    <div className="truncate text-[11px] text-white/48">{statusText}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleHistory}
                    className="rounded-full border border-[var(--line)] bg-white/6 p-2 text-[var(--muted)] transition hover:bg-white/10 hover:text-white"
                    aria-label="Toggle history"
                  >
                    <History className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleExpanded}
                    className="rounded-full border border-[var(--line)] bg-white/6 p-2 text-[var(--muted)] transition hover:bg-white/10 hover:text-white"
                    aria-label={expanded ? "Minimize assistant" : "Expand assistant"}
                  >
                    {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={closeAssistant}
                    className="rounded-full border border-[var(--line)] bg-white/6 p-2 text-[var(--muted)] transition hover:bg-white/10 hover:text-white"
                    aria-label="Close assistant"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              <div className={cn("flex min-h-0 flex-1 overflow-hidden", canShowHistory ? "flex-col md:flex-row" : "flex-col")}>
                {canShowHistory ? (
                  <aside
                    className={cn(
                      "z-[2] flex shrink-0 flex-col border-white/[0.08] bg-[rgba(255,255,255,0.02)] max-md:max-h-[270px] max-md:border-b md:w-[258px] md:border-r",
                    )}
                  >
                    <div className="space-y-4 border-b border-white/[0.08] px-4 py-3">
                      <button
                        type="button"
                        onClick={startFreshConversation}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-white/[0.1] bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200"
                      >
                        <PenSquare className="size-4" />
                        New chat
                      </button>

                      <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">
                          Live context
                        </div>
                        <div className="mt-2 text-sm font-semibold text-white">{humanizePage(page)}</div>
                        <div className="mt-1 text-[12px] leading-6 text-white/52">
                          Prioritizing the current page and core workspace signals to keep replies fast, cheaper, and action-ready.
                        </div>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
                      {loadingHistory ? (
                        <div className="space-y-3">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="skeleton-block h-[74px] rounded-[20px]" />
                          ))}
                        </div>
                      ) : conversations.length ? (
                        <div className="space-y-2">
                          {conversations.map((conversation) => {
                            const active = conversation.id === activeConversationId;

                            return (
                              <div
                                key={conversation.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => void openConversation(conversation.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    void openConversation(conversation.id);
                                  }
                                }}
                                className={cn(
                                  "group w-full rounded-[20px] border px-3 py-3 text-left transition",
                                  active
                                    ? "border-white/[0.16] bg-white/[0.08] text-white"
                                    : "border-white/[0.06] bg-white/[0.02] text-white/70 hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white",
                                )}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold">{conversation.title}</div>
                                    <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-white/46">
                                      {conversation.preview}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 items-center justify-end gap-2">
                                    <div className="rounded-full border border-white/[0.08] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/46">
                                      {relativeTime(conversation.updatedAt)}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => deleteConversation(e, conversation.id)}
                                      className="rounded-full p-1.5 text-white/40 opacity-0 transition-all hover:bg-red-400/10 hover:text-red-400 group-hover:opacity-100"
                                      title="Delete conversation"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/34">
                                  {humanizePage(conversation.pageContext)} / {conversation.messageCount} messages
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-[22px] border border-dashed border-white/[0.08] bg-white/[0.02] p-4 text-[13px] leading-6 text-white/48">
                          Saved chats will appear here once you start using the assistant.
                        </div>
                      )}
                    </div>
                  </aside>
                ) : null}

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="shrink-0 border-b border-white/[0.08] px-4 py-2 sm:px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/58">
                          {activeConversationId
                            ? conversations.find((item) => item.id === activeConversationId)?.title ?? "Saved chat"
                            : "New conversation"}
                        </div>
                        <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-white/48">
                          {providerText}
                        </div>
                        <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-white/48">
                          Workspace edits enabled
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.14) transparent" }}>
                      {loadingConversation ? (
                        <div className="space-y-4">
                          <div className="ml-auto skeleton-block h-[54px] w-[62%] rounded-[22px]" />
                          <div className="skeleton-block h-[108px] w-[78%] rounded-[24px]" />
                          <div className="ml-auto skeleton-block h-[64px] w-[50%] rounded-[22px]" />
                        </div>
                      ) : messages.length <= 1 && !activeConversationId ? (
                        <div className="flex h-full flex-col justify-center">
                          <div className="mx-auto w-full max-w-[520px] space-y-5 rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5 shadow-[0_28px_80px_-50px_rgba(0,0,0,0.95)] sm:p-6">
                            <div className="space-y-3">
                              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                                <Sparkles className="size-3.5" />
                                {humanizePage(page)}
                              </div>
                              <div className="text-[22px] font-semibold leading-[1.08] text-white sm:text-[26px]">
                                Ask for the next move, not a giant brainstorm.
                              </div>
                              <p className="max-w-[52ch] text-[14px] leading-7 text-white/64">
                                I load the most relevant workspace context from this page first, which keeps replies faster and reduces API usage while still letting me update the app when you ask clearly.
                              </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              {QUICK_PROMPTS.map((prompt) => (
                                <button
                                  key={prompt}
                                  type="button"
                                  onClick={() => setInput(prompt)}
                                  className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 text-left text-[13px] leading-6 text-white/72 transition hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white"
                                >
                                  {prompt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {workspaceUpdated ? (
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-xs font-medium text-white">
                              <CheckCircle2 className="size-3.5" />
                              Workspace updated from this conversation
                            </div>
                          ) : null}

                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                            >
                              <div
                                className={cn(
                                  "max-w-[92%] rounded-[24px] border px-4 py-3.5 sm:max-w-[85%]",
                                  message.role === "user"
                                    ? "border-white/20 bg-white text-black shadow-[0_8px_32px_-12px_rgba(255,255,255,0.2)]"
                                    : "border-white/[0.06] bg-white/[0.02] text-white backdrop-blur-md shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]",
                                )}
                              >
                                <div
                                  className={cn(
                                    "mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]",
                                    message.role === "user" ? "text-black/48" : "text-white/40",
                                  )}
                                >
                                  {message.role === "user" ? "You" : "Assistant"} / {relativeTime(message.createdAt)}
                                </div>
                                <div className={cn("space-y-2 text-[14px]", message.role === "user" ? "text-black" : "text-white")}>
                                  {message.role === "assistant" ? (
                                    <ReactMarkdown
                                      components={{
                                        p: ({ children }) => <p className="mb-3 last:mb-0 leading-7">{children}</p>,
                                        ul: ({ children }) => <ul className="mb-3 list-disc pl-4 space-y-1">{children}</ul>,
                                        ol: ({ children }) => <ol className="mb-3 list-decimal pl-4 space-y-1">{children}</ol>,
                                        li: ({ children }) => <li className="leading-6">{children}</li>,
                                        code: ({ children }) => <code className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-[13px]">{children}</code>,
                                        pre: ({ children }) => <pre className="mb-3 overflow-x-auto rounded-xl bg-black/40 p-4 text-[13px] ring-1 ring-white/10">{children}</pre>,
                                        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                                      }}
                                    >
                                      {message.content}
                                    </ReactMarkdown>
                                  ) : (
                                    <p className="whitespace-pre-wrap break-words leading-7">{message.content}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                          {streaming ? (
                            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/[0.04] px-3 py-2 text-sm text-[var(--muted)]">
                              <LoaderCircle className="size-4 animate-spin" />
                              Streaming reply...
                            </div>
                          ) : null}

                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 border-t border-white/[0.08] p-3 sm:p-4">
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          void sendCurrentMessage();
                        }}
                        className="space-y-3"
                      >
                        <div className="flex items-end gap-3">
                          <textarea
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                void sendCurrentMessage();
                              }
                            }}
                            className="field-area min-h-[56px] max-h-[140px] flex-1 resize-none py-3 rounded-[20px]"
                            placeholder="Ask for a review, next step, task creation, log update, or settings change..."
                          />
                          <button
                            type="submit"
                            disabled={!input.trim() || streaming || loadingConversation}
                            className={cn(
                              "inline-flex size-12 items-center justify-center rounded-[18px] transition",
                              input.trim() && !streaming && !loadingConversation
                                ? "bg-white text-black hover:bg-neutral-200"
                                : "cursor-not-allowed bg-white/[0.04] text-[var(--muted)]",
                            )}
                          >
                            <Send className="size-4" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-white/40">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
                              Focused page context
                            </div>
                            <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
                              Saved chat history
                            </div>
                            <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
                              Workspace edits enabled
                            </div>
                          </div>
                          <div>Shift+Enter for a new line</div>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
