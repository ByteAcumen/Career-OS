"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  LoaderCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
  Send,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const MAX_CONTEXT_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 1400;
const MAX_STORED_MESSAGES = 24;
const WELCOME_MESSAGE: Message = {
  id: "assistant-welcome",
  role: "assistant",
  content:
    "Ask for a review, a study plan, or a direct workspace update. I can add tasks, save review notes, and log work when you ask clearly.",
};

function buildRequestMessages(messages: Message[], nextUserMessage: Message) {
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

function formatAssistantText(text: string) {
  return text.split("\n").map((line, index) => (
    <p key={`${line}-${index}`} className="leading-7">
      {line}
    </p>
  ));
}

async function readAssistantError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as {
      message?: string;
      provider?: string;
      code?: string;
    };

    if (payload.message) {
      return payload.message;
    }

    if (payload.provider || payload.code) {
      return [payload.provider, payload.code].filter(Boolean).join(": ");
    }
  }

  const text = await response.text();
  return text || "The assistant could not complete that request.";
}

function getStorageKey(userId: string) {
  return `career-os:assistant:${userId}`;
}

function sanitizeStoredMessages(messages: Message[]) {
  const cleaned = messages
    .filter(
      (message) =>
        message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        typeof message.id === "string",
    )
    .slice(-MAX_STORED_MESSAGES);

  return cleaned.length ? cleaned : [WELCOME_MESSAGE];
}

export function CareerAssistant({ userId }: { userId: string }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [workspaceUpdated, setWorkspaceUpdated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = useMemo(
    () => [
      "Review my week",
      "Add a daily task for resume tailoring tonight",
      "Log a build entry for today's project work",
      "How should I plan tomorrow?",
    ],
    [],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(getStorageKey(userId));
      if (!raw) {
        setMessages([WELCOME_MESSAGE]);
        return;
      }

      const parsed = JSON.parse(raw) as Message[];
      setMessages(sanitizeStoredMessages(parsed));
    } catch {
      setMessages([WELCOME_MESSAGE]);
    }
  }, [mounted, userId]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    try {
      window.localStorage.setItem(
        getStorageKey(userId),
        JSON.stringify(sanitizeStoredMessages(messages)),
      );
    } catch {
      // Ignore storage failures and keep the in-memory conversation alive.
    }
  }, [messages, mounted, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  function clearConversation() {
    setMessages([WELCOME_MESSAGE]);
    setWorkspaceUpdated(false);

    if (!mounted) {
      return;
    }

    try {
      window.localStorage.removeItem(getStorageKey(userId));
    } catch {
      // Ignore storage failures.
    }
  }

  async function sendCurrentMessage() {
    if (!input.trim() || streaming) {
      return;
    }

    const userMessage: Message = {
      id: `${Date.now()}`,
      role: "user",
      content: input.trim(),
    };
    const assistantMessageId = `${Date.now()}-assistant`;

    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantMessageId, role: "assistant", content: "" },
    ]);
    setInput("");
    setStreaming(true);
    setWorkspaceUpdated(false);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: buildRequestMessages(messages, userMessage),
        }),
      });

      if (!response.ok) {
        throw new Error(await readAssistantError(response));
      }

      if (!response.body) {
        throw new Error("The assistant did not return a response stream.");
      }

      const actionsApplied = response.headers.get("x-ai-actions-applied") === "true";
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        currentText += decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessageId
              ? { ...message, content: currentText }
              : message,
          ),
        );
      }

      if (actionsApplied) {
        setWorkspaceUpdated(true);
        router.refresh();
      }
    } catch (error) {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content:
                  error instanceof Error
                    ? error.message
                    : "The assistant could not complete that request.",
              }
            : message,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[75] sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {!open ? (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            onClick={() => setOpen(true)}
            className="pointer-events-auto inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-[rgba(10,10,10,0.94)] px-3 py-3 text-sm font-medium text-white shadow-[0_18px_40px_-28px_rgba(0,0,0,0.95)] backdrop-blur sm:px-4"
          >
            <div className="flex size-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/6">
              <Bot className="size-4 text-white" />
            </div>
            <span className="hidden sm:inline">AI assistant</span>
          </motion.button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            className={cn(
              "pointer-events-auto flex flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[rgba(10,10,10,0.96)] shadow-[0_32px_90px_-42px_rgba(0,0,0,0.98)] backdrop-blur",
              expanded
                ? "h-[80vh] w-[min(92vw,760px)]"
                : "h-[min(78vh,620px)] w-[min(92vw,380px)]",
            )}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-[16px] border border-white/[0.08] bg-white/6">
                  <Bot className="size-4.5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Career AI Assistant</div>
                  <div className="text-xs text-[var(--muted)]">Context-aware, user-scoped, and action-capable</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearConversation}
                  className="rounded-full border border-[var(--line)] bg-white/6 p-2 text-[var(--muted)] transition hover:bg-white/10 hover:text-white"
                  aria-label="Clear conversation"
                  title="Clear conversation"
                >
                  <RotateCcw className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                  className="rounded-full border border-[var(--line)] bg-white/6 p-2 text-[var(--muted)] transition hover:bg-white/10 hover:text-white"
                >
                  {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-[var(--line)] bg-white/6 p-2 text-[var(--muted)] transition hover:bg-white/10 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
              <div className="grid gap-4">
                {workspaceUpdated ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-xs font-medium text-white">
                    <CheckCircle2 className="size-3.5" />
                    Workspace updated from the conversation
                  </div>
                ) : null}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[90%] rounded-[22px] px-4 py-3 text-sm",
                        message.role === "user"
                          ? "border border-white/10 bg-white text-black"
                          : "border border-white/[0.08] bg-white/[0.04] text-white",
                      )}
                    >
                      {message.role === "assistant"
                        ? formatAssistantText(message.content)
                        : message.content}
                    </div>
                  </div>
                ))}

                {streaming ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/[0.04] px-3 py-2 text-sm text-[var(--muted)]">
                    <LoaderCircle className="size-4 animate-spin" />
                    Thinking...
                  </div>
                ) : null}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {messages.length === 1 ? (
              <div className="flex gap-2 overflow-x-auto px-5 pb-4 custom-scrollbar">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="rounded-full border border-[var(--line)] bg-white/[0.04] px-3 py-2 text-xs font-medium text-white transition hover:bg-white/[0.08]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="border-t border-white/[0.08] px-5 py-4">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendCurrentMessage();
                }}
                className="grid gap-3"
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
                    className="field-area min-h-[52px] max-h-[150px] flex-1 resize-none"
                    placeholder="Ask about your plan, progress, or tell me to add tasks, save reviews, or log work..."
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || streaming}
                    className={cn(
                      "inline-flex size-12 items-center justify-center rounded-[18px] transition",
                      input.trim() && !streaming
                        ? "bg-white text-black hover:bg-neutral-200"
                        : "cursor-not-allowed bg-white/[0.04] text-[var(--muted)]",
                    )}
                  >
                    <Send className="size-4" />
                  </button>
                </div>

                <div className="text-[11px] leading-5 text-[var(--muted)]">
                  Conversation is saved on this device for your account. Ask explicitly if you want the assistant to change tasks, reviews, settings, or logs.
                </div>
              </form>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
