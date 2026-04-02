"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
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
    }, 8000);

    return () => window.clearInterval(timer);
  }, [resolvedQuotes]);

  return (
    <div className="rounded-[28px] border border-[var(--line)] bg-white/5 p-4 sm:p-5">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--teal-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">
        <Sparkles className="size-3.5" />
        Daily Push
      </div>

      <div className="min-h-[84px]">
        <AnimatePresence mode="wait">
          <motion.p
            key={`${index}-${resolvedQuotes[index % resolvedQuotes.length]}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="text-base italic leading-8 text-[var(--teal)] sm:text-lg"
          >
            &quot;{resolvedQuotes[index % resolvedQuotes.length]}&quot;
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-3 flex gap-2">
        {resolvedQuotes.map((quote, quoteIndex) => (
          <button
            key={`${quoteIndex}-${quote.slice(0, 12)}`}
            type="button"
            onClick={() => setIndex(quoteIndex)}
            className={`h-1.5 rounded-full transition ${
              quoteIndex === index % resolvedQuotes.length ? "w-8 bg-[var(--teal)]" : "w-3 bg-white/15"
            }`}
            aria-label={`Show quote ${quoteIndex + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
