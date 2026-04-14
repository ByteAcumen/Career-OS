"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, LoaderCircle } from "lucide-react";

import { getWeaknessCurriculumAction } from "@/app/actions";
import { StudentStrategyPanel } from "@/components/student-strategy-panel";
import { useWorkspaceUi } from "@/components/workspace/workspace-shell";
import {
  ActionLink,
  EmptyPanel,
  InfoCard,
  PageHeader,
  SectionCard,
  StatCard,
  riseIn,
  sectionStagger,
} from "@/components/workspace/workspace-primitives";
import { postJson } from "@/lib/client-request";
import type { StrategyPageData } from "@/lib/workspace-data";
import type { StudentStrategy } from "@/lib/types";

export function WorkspaceStrategyPage({
  data,
}: {
  data: StrategyPageData;
}) {
  const { setToast } = useWorkspaceUi();
  const [strategy, setStrategy] = useState<StudentStrategy | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [weakness, setWeakness] = useState("");
  const [weaknessPending, startWeaknessTransition] = useTransition();

  async function generateStrategy() {
    setStrategyLoading(true);

    try {
      const response = await postJson<{ strategy: StudentStrategy }>(
        "/api/ai/strategy",
        undefined,
        {
          method: "POST",
        },
      );
      setStrategy(response.strategy);
      setToast("AI strategy generated.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not generate the strategy.");
    } finally {
      setStrategyLoading(false);
    }
  }

  function generateWeaknessFocus() {
    startWeaknessTransition(() => {
      void getWeaknessCurriculumAction()
        .then((result) => {
          if (!result.ok) {
            throw new Error(result.error || "Could not generate the weakness focus.");
          }

          setWeakness(result.curriculum || "");
          setToast("Weakness focus generated.");
        })
        .catch((error) => {
          setToast(
            error instanceof Error
              ? error.message
              : "Could not generate the weakness focus.",
          );
        });
    });
  }

  const recentPatterns = data.recentDsa.length
    ? data.recentDsa.map((item) => item.pattern).slice(0, 3).join(" | ")
    : "No recent DSA patterns saved yet.";
  const recentAreas = data.recentBuilds.length
    ? data.recentBuilds.map((item) => item.area).slice(0, 3).join(" | ")
    : "No recent build areas saved yet.";
  const recentStatuses = data.recentApplications.length
    ? data.recentApplications.map((item) => item.status).slice(0, 4).join(" | ")
    : "No recent application statuses yet.";

  return (
    <motion.div variants={sectionStagger} initial="hidden" animate="show" className="grid gap-6">
      <motion.div variants={riseIn}>
        <PageHeader
          eyebrow="Strategy"
          title="Use AI as a focused strategist, not as background noise."
          description="Strategy is a dedicated page for weekly direction, weak-spot prioritization, and recommendations grounded in the student data already stored in Career OS."
          actions={
            <>
              <ActionLink href="/planner" label="Open planner" />
              <ActionLink href="/progress" label="Open progress" />
            </>
          }
        />
      </motion.div>

      <motion.div variants={riseIn} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Weekly DSA"
          value={data.metrics.weekDsa}
          detail="Current DSA output used as a signal for AI planning."
        />
        <StatCard
          label="Weekly builds"
          value={data.metrics.weekBuilds}
          detail="Visible build momentum this week."
        />
        <StatCard
          label="Weekly apps"
          value={data.metrics.weekApplications}
          detail="Application pressure and follow-through."
        />
        <StatCard
          label="Open tasks"
          value={data.plannerSummary.active}
          detail="Active tasks still competing for attention."
        />
      </motion.div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.08fr)_0.92fr]">
        <SectionCard
          eyebrow="Generate"
          title="AI strategy"
          description="Generate direction when the week needs correction, not continuously in the background."
        >
          <StudentStrategyPanel
            aiReady={data.integrations.aiReady}
            strategy={strategy}
            isLoading={strategyLoading}
            onGenerate={() => void generateStrategy()}
          />
        </SectionCard>

        <div className="grid gap-6">
          <SectionCard
            eyebrow="Context"
            title="Current operating context"
            description="These are the signals the strategy layer should anchor on before recommending anything."
          >
            <div className="grid gap-3">
              <InfoCard
                label="Primary goal"
                value={
                  data.settings.primaryGoal ||
                  "Add a clear goal in Settings so strategy recommendations become more specific."
                }
              />
              <InfoCard
                label="Target role"
                value={data.settings.targetRole || "No target role set yet."}
              />
              <InfoCard
                label="Weekly theme"
                value={data.settings.weeklyTheme || "No weekly theme set yet."}
              />
              <InfoCard
                label="AI readiness"
                value={
                  data.integrations.aiReady
                    ? "AI provider is ready for strategy generation."
                    : "Add or enable an AI provider in Settings first."
                }
              />
              <InfoCard
                label="Latest coach summary"
                value={
                  data.today.ai?.summary ||
                  "No saved coach summary yet. Generate a strategy when you need a fresh directional read."
                }
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Signals"
            title="What the strategist can see"
            description="The best strategy is grounded in real momentum, not generic advice."
          >
            <div className="grid gap-3">
              <InfoCard
                label="14-day activity"
                value={`${data.history
                  .slice(-14)
                  .reduce(
                    (sum, item) =>
                      sum + item.dsaCount + item.buildCount + item.appCount,
                    0,
                  )} logged outputs across the last 14 days.`}
              />
              <InfoCard label="Recent DSA patterns" value={recentPatterns} />
              <InfoCard label="Recent build areas" value={recentAreas} />
              <InfoCard label="Application pressure" value={recentStatuses} />
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          eyebrow="Weakness"
          title="Weakness focus"
          description="Use one weakness cluster at a time instead of trying to improve every topic at once."
          action={
            <button
              type="button"
              onClick={generateWeaknessFocus}
              disabled={weaknessPending}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/6 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
            >
              {weaknessPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <BrainCircuit className="size-4" />
              )}
              Generate weakness focus
            </button>
          }
        >
          {weakness ? (
            <InfoCard label="Next cluster to attack" value={weakness} />
          ) : (
            <EmptyPanel
              title="No weakness focus yet"
              description="Generate one after logging a few DSA entries and the AI will identify the highest-ROI topic cluster to attack next."
            />
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Execution"
          title="How to use this page well"
          description="Strategy should help you decide what changes this week, not become another feed to keep checking."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <InfoCard
              label="Best moment to generate"
              value="Use it when momentum slips, weekly targets drift, or your next moves feel unclear."
            />
            <InfoCard
              label="What to do after"
              value="Take the strongest recommendation and convert it into Planner tasks instead of leaving it as advice."
            />
            <InfoCard
              label="What improves output"
              value="Cleaner logging and sharper goals make strategy suggestions more specific and more honest."
            />
            <InfoCard
              label="What to avoid"
              value="Do not regenerate repeatedly for novelty. The goal is direction, not endless variation."
            />
          </div>
        </SectionCard>
      </div>
    </motion.div>
  );
}
