"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X, LoaderCircle, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function CareerAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm your Career OS Assistant. I have context on your dashboard, goals, tasks, and applications. Ask me anything about your prep or let's review your progress!"
    }
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    const assistantMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to connect to AI.";
        try {
          const errData = await response.json();
          if (errData.message) errorMessage = errData.message;
        } catch {
          errorMessage = await response.text();
        }
        
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: `⚠️ Error: ${errorMessage}` }
              : m
          )
        );
        setIsStreaming(false);
        return;
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        currentText += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, content: currentText } : m
          )
        );
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: "⚠️ Connection error while streaming." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  // Very basic Markdown parser for bold and code
  const formatText = (text: string) => {
    // We'll just split by newlines for paragraphs, and render code blocks
    const lines = text.split('\n');
    let insideCodeBlock = false;
    let codeContent = [];
    const elements = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('```')) {
            if (insideCodeBlock) {
                elements.push(
                    <pre key={`code-${i}`} className="my-2 p-3 bg-black/40 border border-[var(--line)] rounded-xl text-sm overflow-x-auto text-[var(--teal)] font-mono">
                        <code>{codeContent.join('\n')}</code>
                    </pre>
                );
                codeContent = [];
                insideCodeBlock = false;
            } else {
                insideCodeBlock = true;
            }
        } else if (insideCodeBlock) {
            codeContent.push(line);
        } else {
            // Very simple inline bold parsing
            const parts = line.split(/(\*\*.*?\*\*)/g);
            elements.push(
                <p key={`p-${i}`} className="mb-2 leading-relaxed text-sm">
                    {parts.map((part, index) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={index} className="text-[var(--ink)]">{part.slice(2, -2)}</strong>;
                        }
                        return part;
                    })}
                </p>
            );
        }
    }
    return elements;
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-[var(--teal)] text-[var(--paper-strong)] shadow-[0_8px_32px_rgba(20,184,166,0.3)] hover:scale-105 transition-transform"
          >
            <Bot className="size-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-[24px] border border-[var(--line)] glass-card shadow-2xl transition-all duration-300",
              isExpanded ? "w-[800px] h-[80vh] max-w-[calc(100vw-48px)]" : "w-[400px] h-[600px] max-w-[calc(100vw-48px)]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--card)] p-4 px-5">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-[var(--teal-soft)] text-[var(--teal)]">
                  <Bot className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--ink)]">Career OS Assistant</h3>
                  <p className="text-[11px] text-[var(--teal)]">Context-aware AI</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="rounded-full p-2 text-[var(--muted)] hover:bg-white/10 hover:text-[var(--ink)] transition"
                >
                  {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-2 text-[var(--muted)] hover:bg-white/10 hover:text-[var(--ink)] transition"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div 
                ref={scrollContainerRef}
                className="custom-scrollbar flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-transparent to-black/20"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-[18px] p-4",
                    m.role === "user"
                      ? "ml-auto bg-[var(--ink)] text-[var(--paper)]"
                      : "mr-auto bg-black/40 border border-[var(--line)] text-[var(--muted)]"
                  )}
                >
                  {m.role === "assistant" ? formatText(m.content) : m.content}
                </div>
              ))}
              {isStreaming && (
                <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-[18px] border border-[var(--line)] bg-black/40 px-4 py-3 text-[var(--muted)]">
                  <LoaderCircle className="size-4 animate-spin text-[var(--teal)]" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {messages.length === 1 && (
                <div className="px-4 pb-2 flex gap-2 overflow-x-auto custom-scrollbar no-scrollbar::-webkit-scrollbar">
                    {["Review my progress", "What should I build?", "Help me plan"].map((suggestion) => (
                        <button
                            key={suggestion}
                            type="button"
                            onClick={() => setInput(suggestion)}
                            className="whitespace-nowrap flex-none rounded-full border border-[var(--line)] bg-black/20 px-3 py-1.5 text-[11px] text-[var(--muted)] hover:text-[var(--ink)] hover:border-white/20 transition"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}

            {/* Input Form */}
            <div className="border-t border-[var(--line)] bg-[var(--card)] p-4">
              <form onSubmit={handleSubmit} className="relative flex items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  className="field-area min-h-[44px] max-h-[150px] !py-[12px] !pr-14 flex-1 custom-scrollbar resize-none"
                  placeholder="Ask about your targets, code, or tasks..."
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isStreaming}
                  className={cn(
                    "absolute right-2 top-2 bottom-2 aspect-square rounded-[10px] flex items-center justify-center transition-all",
                    input.trim() && !isStreaming
                      ? "bg-[var(--teal)] text-[var(--paper-strong)]"
                      : "bg-white/5 text-[var(--muted)]"
                  )}
                >
                  <Send className="size-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
