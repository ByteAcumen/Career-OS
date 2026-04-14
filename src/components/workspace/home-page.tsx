"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { ArrowUpRight, ListTodo, Sparkles } from "lucide-react";

import { ActivityBarChart } from "@/components/activity-bar-chart";
import {
  EmptyPanel,
  InfoCard,
  PageHeader,
  ProgressMeter,
  SectionCard,
  StatCard,
  riseIn,
  sectionStagger,
} from "@/components/workspace/workspace-primitives";
import type { HomePageData } from "@/lib/workspace-data";

export function WorkspaceHomePage({
  data,
}: {
  data: HomePageData;
}) {
  const focusTasks = data.planner.tasks
    .filter((task) => task.scope === "daily" && task.status !== "done")
    .slice(0, 3);
  const weeklyOutputs =
    data.metrics.weekApplications + data.metrics.weekBuilds + data.metrics.weekDsa;
  const weeklyTargetHit = Math.round(
    (data.metrics.targetProgress.dsa +
      data.metrics.targetProgress.applications +
      data.metrics.targetProgress.builds) /
      3,
  );
  const nextBlock = data.scheduleBlocks[0];
  const nextTwoBlocks = data.scheduleBlocks.slice(0, 2);
  const coachSnapshot = data.today.ai ?? {
    summary: focusTasks[0]?.title
      ? `Start with "${focusTasks[0].title}" before lower-value cleanup or browsing.`
      : "Add one daily task in Planner so Home can point clearly to the next meaningful move.",
    biggestRisk:
      data.planner.summary.todayOpen > 4
        ? "You have too many open tasks for a clean day. Trim the list before starting."
        : "The biggest risk today is ambiguity. Decide the first block before you drift.",
    focusTheme:
      data.settings.weeklyTheme ||
      data.settings.primaryGoal ||
      "Set a weekly theme in Settings so AI guidance stays more specific.",
    morningPlan: nextBlock
      ? `${nextBlock.timeLabel} - ${nextBlock.label}`
      : "No schedule block is queued right now.",
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
          title="See the work that matters now."
          description="Home stays work-focused: your next tasks, the next planned block, weekly pace, recent proof of work, and one compact AI read on what to protect."
          actions={
            <>
              <Link
                href="/planner"
                className="inline-flex min-w-[148px] items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-neutral-200"
              >
                Open planner
              </Link>
              <Link
                href="/logger"
                className="inline-flex min-w-[132px] items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white/6 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10"
              >
                Log work
              </Link>
            </>
          }
        />
      </motion.div>

      <motion.div variants={riseIn} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current streak"
          value={`${data.metrics.currentStreak} days`}
          detail="Consecutive days with visible work."
        />
        <StatCard
          label="Open today"
          value={data.planner.summary.todayOpen}
          detail="Tasks that still need attention today."
        />
        <StatCard
          label="Weekly outputs"
          value={weeklyOutputs}
          detail="Combined DSA, builds, and applications this week."
        />
        <StatCard
          label="Target hit"
          value={`${weeklyTargetHit}%`}
          detail="Average progress against your weekly goals."
        />
      </motion.div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_0.88fr]">
        <SectionCard
          eyebrow="Today"
          title="Today's focus stack"
          description="Keep Home narrow: pick the next one to three tasks, protect the first work block, and avoid scanning the whole product before you begin."
          action={
            <div className="rounded-full border border-[var(--line)] bg-white/6 px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
              {format(parseISO(data.today.dateKey), "EEE, MMM d")}
            </div>
          }
        >
          {focusTasks.length ? (
            <div className="grid gap-3">
              {focusTasks.map((task, index) => (
                <div key={task.id} className="soft-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex size-7 items-center justify-center rounded-full border border-[var(--line)] bg-white/6 text-[11px] font-semibold text-white">
                          {index + 1}
                        </span>
                        <div className="text-sm font-medium text-white">{task.title}</div>
                        <span className="rounded-full border border-[var(--line)] bg-white/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                          {task.category}
                        </span>
                        <span className="rounded-full border border-[var(--line)] bg-white/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                          {task.priority}
                        </span>
                      </div>
                      {task.details ? (
                        <div className="mt-3 text-sm leading-7 text-[var(--muted)]">
                          {task.details}
                        </div>
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
              description="Add one clearly named daily task in Planner so Home can steer the day without guesswork."
            />
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InfoCard
              label="Next planned block"
              value={
                nextBlock
                  ? `${nextBlock.timeLabel} - ${nextBlock.label}`
                  : "No schedule block is queued. Open Planner and add one anchor block."
              }
            />
            <InfoCard
              label="Tomorrow handoff"
              value={
                data.today.tomorrowTask ||
                "Use shutdown review to write tomorrow's first task before you stop."
              }
            />
          </div>
        </SectionCard>

        <div className="grid gap-6">
          <SectionCard
            eyebrow="Overview"
            title="Workboard"
            description="The home page should help you decide, not make you dig."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard
                label="Primary goal"
                value={
                  data.settings.primaryGoal ||
                  "Set a primary goal in Settings so the dashboard can stay aligned."
                }
              />
              <InfoCard
                label="Weekly theme"
                value={
                  data.settings.weeklyTheme ||
                  "No weekly theme yet. Add one to keep your planning more intentional."
                }
              />
              <InfoCard
                label="Planner load"
                value={`${data.planner.summary.active} active tasks across daily, weekly, and weekend lanes.`}
              />
              <InfoCard
                label="Next move"
                value={
                  focusTasks[0]?.title
                    ? `Start with "${focusTasks[0].title}" before opening anything else.`
                    : "Open Planner and define one concrete task for today."
                }
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Link
                href="/planner"
                className="soft-card block hover:border-[var(--line-strong)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">Plan the day</div>
                    <div className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      Adjust daily, weekly, and weekend lanes.
                    </div>
                  </div>
                  <ListTodo className="mt-1 size-4 text-[var(--muted)]" />
                </div>
              </Link>

              <Link
                href="/logger"
                className="soft-card block hover:border-[var(--line-strong)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">Log finished work</div>
                    <div className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      Capture DSA, builds, and applications fast.
                    </div>
                  </div>
                  <ArrowUpRight className="mt-1 size-4 text-[var(--muted)]" />
                </div>
              </Link>

              <Link
                href="/strategy"
                className="soft-card block hover:border-[var(--line-strong)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">Check strategy</div>
                    <div className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      Review AI guidance when the week needs correction.
                    </div>
                  </div>
                  <Sparkles className="mt-1 size-4 text-[var(--muted)]" />
                </div>
              </Link>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Coach"
            title="AI snapshot"
            description="One useful read on theme, risk, and next block is enough here."
          >
            <div className="grid gap-3">
              <InfoCard label="Summary" value={coachSnapshot.summary} />
              <InfoCard label="Focus theme" value={coachSnapshot.focusTheme} />
              <InfoCard label="Biggest risk" value={coachSnapshot.biggestRisk} />
              <InfoCard label="Next block" value={coachSnapshot.morningPlan} />
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          eyebrow="This week"
          title="Weekly pace"
          description="Targets stay here so Home can show pace without turning into a second planner."
        >
          <div className="grid gap-3">
            <ProgressMeter
              label="DSA problems"
              current={data.metrics.weekDsa}
              target={data.settings.weeklyDsaTarget}
            />
            <ProgressMeter
              label="Applications"
              current={data.metrics.weekApplications}
              target={data.settings.weeklyApplicationTarget}
            />
            <ProgressMeter
              label="Build outputs"
              current={data.metrics.weekBuilds}
              target={data.settings.weeklyBuildTarget}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InfoCard
              label="Planner completion"
              value={`${data.planner.summary.completed}/${data.planner.summary.total} tasks completed so far.`}
            />
            <InfoCard
              label="Upcoming rhythm"
              value={
                nextTwoBlocks.length
                  ? nextTwoBlocks
                      .map((block) => `${block.timeLabel} - ${block.label}`)
                      .join(" | ")
                  : "No blocks are scheduled yet. Add a simple work rhythm in Planner."
              }
            />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Recent"
          title="Recent proof of work"
          description="A compact feed of what you actually shipped, solved, or applied for."
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
              {data.recentActivity.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-[22px] border border-[var(--line)] bg-white/[0.02] px-4 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[var(--line)] bg-white/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                        {item.kind}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {format(parseISO(item.createdAt), "MMM d")}
                      </span>
                    </div>

                    <div className="mt-3 text-sm font-medium text-white">{item.title}</div>
                    <div className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      {item.detail}
                    </div>
                    <div className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                      {item.meta}
                    </div>
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
              ))}
            </div>
          ) : (
            <EmptyPanel
              title="No recent proof yet"
              description="As soon as you log DSA, build work, or applications, the strongest recent signals will show up here."
            />
          )}
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Trend"
        title="Momentum"
        description="A small trend view is enough on Home. Deeper analysis stays on Progress."
      >
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <ActivityBarChart data={data.history.slice(-14)} />

          <div className="grid gap-3">
            <InfoCard
              label="Best use of Home"
              value="Use this page to decide the next move, then switch into Planner, Logger, or Progress for deeper work."
              muted
            />
            <InfoCard
              label="Current constraint"
              value={
                data.planner.summary.todayOpen > 4
                  ? "Your open task count is still a little high. Reduce it so the day feels lighter."
                  : "The workspace is light enough. Protect the first block and keep the next task obvious."
              }
              className="border-white/[0.1]"
            />
            <InfoCard
              label="Weekend loadout"
              value={`${data.settings.weekendDsaMinutes} minutes for DSA and ${data.settings.weekendBuildMinutes} minutes for build work.`}
              muted
            />
          </div>
        </div>
      </SectionCard>
    </motion.div>
  );
}
