"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { ActivityBarChart } from "@/components/activity-bar-chart";
import { MotivationCarousel } from "@/components/motivation-carousel";
import { riseIn, sectionStagger, PageHeader, ProgressMeter, SectionCard, StatCard, EmptyPanel, InfoCard } from "@/components/workspace/workspace-primitives";
import type { HomePageData } from "@/lib/workspace-data";

function buildQuotes(targetRole: string) {
  const role = targetRole.trim() || "software engineer";

  return [
    `Keep the next task obvious, finishable, and worthy of the ${role} role you want.`,
    `A quiet block of deliberate work compounds faster than a day of scattered intent.`,
    `Use the home page to decide, then move into execution before motivation becomes the bottleneck.`,
  ];
}

export function WorkspaceHomePage({
  data,
}: {
  data: HomePageData;
}) {
  const focusTasks = data.planner.tasks.filter((task) => task.scope === "daily" && task.status !== "done").slice(0, 3);
  const weeklyOutputs = data.metrics.weekApplications + data.metrics.weekBuilds + data.metrics.weekDsa;
  const nextBlock = data.scheduleBlocks[0];
  const coachSnapshot = data.today.ai ?? {
    summary: focusTasks[0]?.title
      ? `Start with "${focusTasks[0].title}" before touching low-value cleanup work.`
      : "There is no active daily task yet. Add one clear task in Planner so the day begins with direction.",
    biggestRisk:
      data.planner.summary.todayOpen > 4
        ? "Too many open tasks can turn the day into context switching instead of clear progress."
        : "The biggest risk is ambiguity, not difficulty. Protect one obvious task first.",
    focusTheme: data.settings.weeklyTheme || data.settings.primaryGoal || "Define a clearer weekly theme in Settings.",
    morningPlan: nextBlock ? `${nextBlock.timeLabel} · ${nextBlock.label}` : "No schedule block is queued right now.",
    nightPlan: "",
    applyPlan: "",
    oneCut: "",
    weekendMission: "",
  };

  return (
    <motion.div variants={sectionStagger} initial="hidden" animate="show" className="grid gap-6">
      <motion.div variants={riseIn}>
        <PageHeader
          eyebrow="Home"
          title="A quieter command center for the work that matters today."
          description="Home is now summary-first: a narrow view of your next task, weekly momentum, recent proof of work, and the most relevant AI guidance."
          actions={
            <>
              <Link
                href="/planner"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-neutral-200"
              >
                Open planner
              </Link>
              <Link
                href="/logger"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/6 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10"
              >
                Log work
              </Link>
            </>
          }
        />
      </motion.div>

      <motion.div variants={riseIn} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current streak" value={`${data.metrics.currentStreak} days`} detail="Consecutive days with visible work." />
        <StatCard label="Open today" value={data.planner.summary.todayOpen} detail="Tasks still active in your daily lane." />
        <StatCard label="Weekly outputs" value={weeklyOutputs} detail="DSA, builds, and applications logged this week." />
        <StatCard label="XP progress" value={`${data.metrics.levelProgress}%`} detail={`Level ${data.metrics.level} progression toward the next milestone.`} />
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_0.95fr]">
        <div className="grid gap-6">
          <SectionCard
            title="Today focus"
            description="The next three tasks should be enough to steer the day without forcing you to scan every part of the app."
            action={
              <div className="rounded-full border border-[var(--line)] bg-white/6 px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
                {data.today.dateKey}
              </div>
            }
          >
            {focusTasks.length ? (
              <div className="grid gap-3">
                {focusTasks.map((task, index) => (
                  <div key={task.id} className="soft-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex size-6 items-center justify-center rounded-full border border-[var(--line)] bg-white/6 text-[11px] font-semibold text-white">
                            {index + 1}
                          </span>
                          <div className="text-sm font-medium text-white">{task.title}</div>
                          <span className="rounded-full border border-[var(--line)] bg-white/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                            {task.category}
                          </span>
                        </div>
                        {task.details ? (
                          <div className="mt-3 text-sm leading-7 text-[var(--muted)]">{task.details}</div>
                        ) : null}
                      </div>
                      <div className="rounded-full border border-[var(--line)] bg-white/6 px-3 py-1 text-xs font-medium text-white">
                        {task.estimateMinutes}m
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel
                title="No active daily tasks yet"
                description="Add a single daily task in Planner so Home can point clearly to the next finishable step."
              />
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoCard
                label="Next planned block"
                value={nextBlock ? `${nextBlock.timeLabel} · ${nextBlock.label}` : "No schedule block is queued for today."}
              />
              <InfoCard
                label="Tomorrow handoff"
                value={data.today.tomorrowTask || "Write tomorrow's first task during your shutdown review."}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Recent activity"
            description="A compact feed of the latest work that moved your interview prep forward."
            action={
              <Link
                href="/progress"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/6 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
              >
                Open progress
              </Link>
            }
          >
            {data.recentActivity.length ? (
              <div className="grid gap-3">
                {data.recentActivity.map((item) => (
                  <div key={item.id} className="soft-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-[var(--line)] bg-white/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                            {item.kind}
                          </span>
                          <span className="text-xs text-[var(--muted)]">
                            {format(parseISO(item.createdAt), "MMM d")}
                          </span>
                        </div>
                        <div className="mt-3 text-sm font-medium text-white">{item.title}</div>
                        <div className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.detail}</div>
                        <div className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">{item.meta}</div>
                      </div>

                      {item.href ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-white/6 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                        >
                          Open
                          <ArrowUpRight className="size-3.5 text-[var(--muted)]" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel
                title="No recent activity yet"
                description="Your latest DSA, builds, and applications will show up here as soon as you log them."
              />
            )}
          </SectionCard>
        </div>

        <div className="grid gap-6">
          <SectionCard
            title="AI snapshot"
            description="AI stays supportive here: one concise view of the current theme, risk, and next block."
          >
            <div className="grid gap-3">
              <InfoCard label="Summary" value={coachSnapshot.summary} />
              <InfoCard label="Focus theme" value={coachSnapshot.focusTheme} />
              <InfoCard label="Biggest risk" value={coachSnapshot.biggestRisk} />
              <InfoCard label="Next block" value={coachSnapshot.morningPlan} />
            </div>
          </SectionCard>

          <motion.div variants={riseIn}>
            <MotivationCarousel quotes={buildQuotes(data.settings.targetRole)} />
          </motion.div>

          <SectionCard
            title="This week"
            description="Targets and weekly pacing belong here so Home stays useful without becoming another planner screen."
          >
            <div className="grid gap-3">
              <ProgressMeter label="DSA problems" current={data.metrics.weekDsa} target={data.settings.weeklyDsaTarget} />
              <ProgressMeter label="Applications" current={data.metrics.weekApplications} target={data.settings.weeklyApplicationTarget} />
              <ProgressMeter label="Build outputs" current={data.metrics.weekBuilds} target={data.settings.weeklyBuildTarget} />
            </div>

            <div className="mt-4 grid gap-3">
              <InfoCard label="Weekly theme" value={data.settings.weeklyTheme || "Add a weekly theme in Settings to keep decisions more consistent."} />
              <InfoCard label="Planner completion" value={`${data.planner.summary.completed}/${data.planner.summary.total} tasks completed`} />
            </div>
          </SectionCard>

          <SectionCard
            title="14-day momentum"
            description="A narrow trend view is enough here. Deeper timeline inspection stays on Progress."
          >
            <ActivityBarChart data={data.history.slice(-14)} />
          </SectionCard>
        </div>
      </div>
    </motion.div>
  );
}
