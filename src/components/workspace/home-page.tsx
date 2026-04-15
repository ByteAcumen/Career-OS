"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Code2,
  ExternalLink,
  Link2,
  Target,
  type LucideIcon,
} from "lucide-react";

import { ActivityBarChart } from "@/components/activity-bar-chart";
import {
  EmptyPanel,
  InfoCard,
  ProgressMeter,
  SectionCard,
  riseIn,
  sectionStagger,
} from "@/components/workspace/workspace-primitives";
import type { HomePageData } from "@/lib/workspace-data";

type SavedLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

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
  const savedLinks = getSavedLinks(data.settings);
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
    <motion.div variants={sectionStagger} initial="hidden" animate="show" className="grid gap-5">
      <motion.section variants={riseIn} className="glass-card rounded-[30px] p-5 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
          <div>
            <div className="page-pill">Home</div>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.045em] text-white sm:text-4xl">
              Focus on the next useful move.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Home is a compact command center: next tasks, weekly pace, saved links,
              recent proof, and one AI read. Deeper work stays inside Planner, Logger,
              Progress, and Strategy.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/planner"
                className="inline-flex min-w-[132px] items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-neutral-200"
              >
                Open planner
              </Link>
              <Link
                href="/logger"
                className="inline-flex min-w-[118px] items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white/6 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10"
              >
                Log work
              </Link>
              <Link
                href="/strategy"
                className="inline-flex min-w-[124px] items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white/6 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10"
              >
                Strategy
              </Link>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--line)] bg-white/[0.025] p-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              <CalendarClock className="size-3.5" />
              Next block
            </div>
            <div className="mt-3 text-base font-semibold text-white">
              {nextBlock ? nextBlock.label : "No block queued"}
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {nextBlock
                ? `${nextBlock.timeLabel} - ${nextBlock.description}`
                : "Open Planner and add one simple anchor block for today."}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Streak"
            value={`${data.metrics.currentStreak}d`}
            detail="Visible work"
          />
          <MetricTile
            label="Open today"
            value={data.planner.summary.todayOpen}
            detail="Tasks needing attention"
          />
          <MetricTile
            label="Week output"
            value={weeklyOutputs}
            detail="DSA, builds, applications"
          />
          <MetricTile
            label="Target hit"
            value={`${weeklyTargetHit}%`}
            detail="Average weekly pace"
          />
        </div>
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_0.85fr]">
        <SectionCard
          eyebrow="Today"
          title="Focus stack"
          description="Pick one to three tasks and keep the first block obvious."
          action={
            <div className="rounded-full border border-[var(--line)] bg-white/6 px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
              {format(parseISO(data.today.dateKey), "EEE, MMM d")}
            </div>
          }
        >
          {focusTasks.length ? (
            <div className="grid gap-3">
              {focusTasks.map((task, index) => (
                <div key={task.id} className="rounded-[22px] border border-[var(--line)] bg-white/[0.025] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex size-7 items-center justify-center rounded-full border border-[var(--line)] bg-white/6 text-[11px] font-semibold text-white">
                          {index + 1}
                        </span>
                        <div className="text-sm font-semibold text-white">{task.title}</div>
                      </div>

                      {task.details ? (
                        <div className="mt-3 text-sm leading-7 text-[var(--muted)]">
                          {task.details}
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                        <span className="rounded-full border border-[var(--line)] bg-white/6 px-2.5 py-1">
                          {task.category}
                        </span>
                        <span className="rounded-full border border-[var(--line)] bg-white/6 px-2.5 py-1">
                          {task.priority}
                        </span>
                        <span className="rounded-full border border-[var(--line)] bg-white/6 px-2.5 py-1">
                          {task.estimateMinutes}m
                        </span>
                      </div>
                    </div>
                    <CheckCircle2 className="mt-1 size-4 text-[var(--muted)]" />
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
              label="Tomorrow handoff"
              value={
                data.today.tomorrowTask ||
                "Use shutdown review to write tomorrow's first task before you stop."
              }
            />
            <InfoCard
              label="Planner load"
              value={`${data.planner.summary.active} active tasks across daily, weekly, and weekend lanes.`}
            />
          </div>
        </SectionCard>

        <div className="grid gap-5">
          <SectionCard
            eyebrow="Links"
            title="Saved profiles"
            description="Quick access to the external profiles and trackers you saved in Settings."
          >
            {savedLinks.length ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {savedLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between gap-3 rounded-[18px] border border-[var(--line)] bg-white/[0.025] px-3 py-3 text-sm text-white hover:border-[var(--line-strong)] hover:bg-white/[0.05]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-[14px] border border-[var(--line)] bg-white/[0.04]">
                        <item.icon className="size-4 text-white" />
                      </span>
                      <span className="truncate font-medium">{item.label}</span>
                    </span>
                    <ExternalLink className="size-3.5 shrink-0 text-[var(--muted)] transition group-hover:text-white" />
                  </a>
                ))}
              </div>
            ) : (
              <EmptyPanel
                title="No saved links yet"
                description="Add GitHub, LeetCode, LinkedIn, portfolio, resume, or tracker links in Settings."
              />
            )}
          </SectionCard>

          <SectionCard
            eyebrow="Coach"
            title="AI snapshot"
            description="One compact read so AI supports the day without taking over the page."
          >
            <div className="grid gap-3">
              <InfoCard label="Summary" value={coachSnapshot.summary} />
              <InfoCard label="Focus theme" value={coachSnapshot.focusTheme} />
              <InfoCard label="Risk" value={coachSnapshot.biggestRisk} />
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <SectionCard
          eyebrow="Pace"
          title="Weekly progress"
          description="A simple target view belongs on Home. Deeper analytics stay on Progress."
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

          <div className="mt-4 grid gap-3">
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
          title="Proof of work"
          description="A compact feed of what you shipped, solved, or applied for."
          action={
            <Link
              href="/progress"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/6 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
            >
              Progress
            </Link>
          }
        >
          {data.recentActivity.length ? (
            <div className="grid gap-3">
              {data.recentActivity.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-[20px] border border-[var(--line)] bg-white/[0.02] px-4 py-3"
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

                    <div className="mt-2 text-sm font-medium text-white">{item.title}</div>
                    <div className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      {item.detail}
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
        description="A small trend view is enough here. Full analytics stay on Progress."
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <ActivityBarChart data={data.history.slice(-14)} />

          <div className="grid gap-3">
            <InfoCard
              label="Current constraint"
              value={
                data.planner.summary.todayOpen > 4
                  ? "Your open task count is high. Reduce it so the day feels lighter."
                  : "The workspace is light enough. Protect the first block and keep the next task obvious."
              }
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

function MetricTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-white/[0.025] px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{value}</div>
      <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</div>
    </div>
  );
}

function getSavedLinks(settings: HomePageData["settings"]): SavedLink[] {
  return [
    { label: "GitHub", href: settings.githubUrl, icon: Code2 },
    { label: "LeetCode", href: settings.leetcodeUrl, icon: Code2 },
    { label: "LinkedIn", href: settings.linkedinUrl, icon: Link2 },
    { label: "Portfolio", href: settings.portfolioUrl, icon: Link2 },
    { label: "Resume", href: settings.resumeUrl, icon: Target },
    { label: "Job tracker", href: settings.jobTrackerUrl, icon: BriefcaseBusiness },
    { label: "Codeforces", href: settings.codeforcesUrl, icon: Code2 },
    { label: "CodeChef", href: settings.codechefUrl, icon: Code2 },
    { label: "HackerRank", href: settings.hackerrankUrl, icon: Code2 },
  ].filter((item) => item.href.trim());
}
