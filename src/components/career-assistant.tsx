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

      // Capture provider from header if available
      const activeProvider = response.headers.get("x-ai-provider");
      if (activeProvider) {
        console.log(`[Assistant] Served by: ${activeProvider}`);
      }

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
    const lines = text.split('\n');
    let insideCodeBlock = false;
    let codeContent = [];
    const elements = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('```')) {
            if (insideCodeBlock) {
                elements.push(
                    <pre key={`code-${i}`} className="my-3 p-4 bg-black/60 border border-[var(--line)] rounded-xl text-xs overflow-x-auto text-[var(--teal)] font-mono shadow-inner lg:text-sm">
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
            const parts = line.split(/(\*\*.*?\*\*)/g);
            elements.push(
                <p key={`p-${i}`} className="mb-3 leading-relaxed text-sm lg:text-base opacity-90">
                    {parts.map((part, index) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={index} className="text-[var(--ink)] font-bold">{part.slice(2, -2)}</strong>;
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
            initial={{ scale: 0.8, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 10 }}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-[var(--teal)] text-black shadow-[0_12px_40px_rgba(45,212,191,0.4)] transition-shadow hover:shadow-[0_16px_48px_rgba(45,212,191,0.5)]"
          >
            <Bot className="size-7" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.92 }}
            transition={{ type: "spring", damping: 25, stiffness: 240 }}
            className={cn(
              "fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-[32px] border border-white/10 glass-card shadow-xl transition-all duration-500",
              isExpanded 
                ? "w-[850px] h-[85vh] max-w-[calc(100vw-48px)] bottom-6 right-6" 
                : "w-[420px] h-[640px] max-w-[calc(100vw-48px)]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 bg-white/5 p-5 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-[var(--teal)] text-black shadow-[0_0_20px_rgba(45,212,191,0.3)]">
                        <Bot className="size-5.5" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#111] bg-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--ink)] lg:text-base">Career AI Assistant</h3>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75"></span>
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-500"></span>
                    </span>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--teal)] opacity-80 lg:text-xs">Context-aware active</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="rounded-xl p-2 text-[var(--muted)] hover:bg-white/10 hover:text-[var(--ink)] transition-all"
                >
                  {isExpanded ? <Minimize2 className="size-4.5" /> : <Maximize2 className="size-4.5" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl p-2 text-[var(--muted)] hover:bg-white/10 hover:text-[var(--ink)] transition-all"
                >
                  <X className="size-4.5" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div 
                ref={scrollContainerRef}
                className="custom-scrollbar flex-1 overflow-y-auto p-5 space-y-6 bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.03)_0%,transparent_50%)]"
            >
              {messages.map((m, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  key={m.id}
                  className={cn(
                    "flex flex-col gap-1.5",
                    m.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                        "relative max-w-[88%] rounded-[22px] px-5 py-3.5 shadow-sm lg:px-6 lg:py-4",
                        m.role === "user"
                        ? "bg-[var(--teal)] text-black font-medium"
                        : "bg-white/5 border border-white/5 text-[var(--ink)] backdrop-blur-sm"
                    )}
                  >
                    {m.role === "assistant" ? formatText(m.content) : m.content}
                    
                    {/* Timestamp or Status */}
                    <div className={cn(
                        "mt-2 text-[9px] opacity-40 uppercase tracking-widest",
                        m.role === "user" ? "text-right" : "text-left"
                    )}>
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isStreaming && (
                <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mr-auto flex items-center gap-3 rounded-[22px] border border-white/5 bg-white/5 px-5 py-3 text-[var(--muted)] shadow-sm"
                >
                  <LoaderCircle className="size-4 animate-spin text-[var(--teal)]" />
                  <span className="text-sm font-medium tracking-wide">AI is deep thinking...</span>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {messages.length === 1 && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="px-5 pb-4 flex gap-2.5 overflow-x-auto custom-scrollbar no-scrollbar::-webkit-scrollbar"
                >
                    {["Review my progress", "What should I build?", "Help me plan"].map((suggestion) => (
                        <button
                            key={suggestion}
                            type="button"
                            onClick={() => setInput(suggestion)}
                            className="whitespace-nowrap flex-none rounded-2xl border border-white/5 bg-white/5 px-4 py-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] transition-all duration-300"
                        >
                            {suggestion}
                        </button>
                    ))}
                </motion.div>
            )}

            {/* Input Form */}
            <div className="border-t border-white/5 bg-white/5 p-5 backdrop-blur-xl">
              <form onSubmit={handleSubmit} className="relative flex items-end gap-3">
                <div className="relative flex-1">
                    <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                        }
                    }}
                    className="field-area min-h-[52px] max-h-[180px] !py-[14px] !pr-12 !pl-5 flex-1 custom-scrollbar resize-none border-white/10 bg-white/5 focus:border-[var(--teal)] focus:ring-1 focus:ring-[var(--teal)/20] transition-all"
                    placeholder="Ask about your prep or sync data..."
                    />
                    <div className="absolute right-4 bottom-3.5 flex items-center gap-2">
                         <span className="text-[10px] text-[var(--muted)] opacity-50 hidden sm:inline">Enter to send</span>
                    </div>
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isStreaming}
                  className={cn(
                    "flex size-12 items-center justify-center rounded-2xl transition-all duration-500 shadow-lg",
                    input.trim() && !isStreaming
                      ? "bg-[var(--teal)] text-black shadow-[0_8px_24px_rgba(45,212,191,0.3)] hover:scale-105 active:scale-95"
                      : "bg-white/5 text-[var(--muted)] cursor-not-allowed opacity-50"
                  )}
                >
                  <Send className={cn("size-5 transition-transform", input.trim() && "group-hover:translate-x-0.5 group-hover:-translate-y-0.5")} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
