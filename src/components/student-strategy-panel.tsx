"use client";

import { BrainCircuit, LoaderCircle, Sparkles } from "lucide-react";

import type { StudentStrategy } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StudentStrategyPanel({
  aiReady,
  strategy,
  isLoading,
  onGenerate,
}: {
  aiReady: boolean;
  strategy: StudentStrategy | null;
  isLoading: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Personalized AI Strategy
          </div>
          <div className="mt-2 text-lg font-semibold text-[var(--ink)]">
            Student-specific direction from your real data
          </div>
        </div>
        <button
          disabled={!aiReady || isLoading}
          onClick={onGenerate}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
            aiReady && !isLoading
              ? "bg-[var(--ink)] text-[var(--paper-strong)]"
              : "cursor-not-allowed bg-white/10 text-[var(--muted)]",
          )}
        >
          {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {isLoading ? "Generating..." : "Generate strategy"}
        </button>
      </div>

      {strategy ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Headline", strategy.headline],
            ["Today mission", strategy.todayMission],
            ["DSA priority", strategy.dsaPriority],
            ["Build priority", strategy.buildPriority],
            ["Application priority", strategy.applicationPriority],
            ["Mock interview", strategy.mockInterviewTask],
            ["Reality check", strategy.realityCheck],
          ].map(([label, value]) => (
            <div key={label} className="soft-card">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                {label}
              </div>
              <div className="mt-3 text-sm leading-7 text-[var(--ink)]">{value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="soft-card text-sm leading-7 text-[var(--muted)]">
          <div className="inline-flex items-center gap-2 font-medium text-[var(--ink)]">
            <BrainCircuit className="size-4 text-[var(--teal)]" />
            What this gives you
          </div>
          <div className="mt-3">
            A practical plan for what to study, what to build, what to apply to,
            and where your interview prep is drifting based on the data already in
            your workspace.
          </div>
        </div>
      )}
    </div>
  );
}
