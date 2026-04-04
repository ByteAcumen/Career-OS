"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Quote, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const fallbackQuotes = [
  "Momentum is built by shipping one honest block of work before the excuses arrive.",
  "A calm hour of focused practice beats a dramatic day of overplanning.",
  "Your next offer is hiding inside the boring reps you keep showing up for.",
  "Treat today like a compounding asset and protect the work that moves your career forward.",
];

export function MotivationCarousel({
  quotes,
}: {
  quotes: string[];
}) {
  const resolvedQuotes = useMemo(
    () => (quotes.length ? quotes : fallbackQuotes),
    [quotes],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (resolvedQuotes.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % resolvedQuotes.length);
    }, 8200);

    return () => window.clearInterval(timer);
  }, [resolvedQuotes]);

  const activeQuote = resolvedQuotes[index % resolvedQuotes.length];

  return (
    <div className="glass-card rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--teal-soft)] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--teal)]">
          <Sparkles className="size-3.5" />
          Daily Push
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
          <Quote className="size-3.5" />
          Quote {index + 1}/{resolvedQuotes.length}
        </div>
      </div>

      <div className="mt-5 min-h-[136px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${index}-${activeQuote}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="max-w-xl text-lg leading-8 text-[var(--ink)] sm:text-[1.14rem] sm:leading-8">
              {activeQuote}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {resolvedQuotes.map((quote, quoteIndex) => (
            <button
              key={`${quoteIndex}-${quote.slice(0, 12)}`}
              type="button"
              onClick={() => setIndex(quoteIndex)}
              className={`rounded-full transition-all duration-300 ${
                quoteIndex === index % resolvedQuotes.length
                  ? "h-2 w-10 bg-[var(--teal)] shadow-[0_0_18px_rgba(94,234,212,0.35)]"
                  : "h-2 w-3 bg-white/14 hover:bg-white/28"
              }`}
              aria-label={`Show quote ${quoteIndex + 1}`}
            />
          ))}
        </div>

        <div className="max-w-[18rem] text-right text-xs leading-6 text-[var(--muted)]">
          Keep your next task obvious, finishable, and difficult to avoid.
        </div>
      </div>
    </div>
  );
}
