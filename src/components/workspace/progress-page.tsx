"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Briefcase,
  BrainCircuit,
  GitBranch,
  Rocket,
  X,
} from "lucide-react";

import { ActivityBarChart } from "@/components/activity-bar-chart";
import { EmptyPanel, PageHeader, SectionCard, StatCard, riseIn, sectionStagger } from "@/components/workspace/workspace-primitives";
import { postJson } from "@/lib/client-request";
import type { ProgressPageData } from "@/lib/workspace-data";
import { cn } from "@/lib/utils";

type DailyDetail = {
  dateKey: string;
  checkins: Record<string, boolean>;
  note: string;
  tomorrowTask: string;
  aiSummary: string | null;
  dsa: Array<{
    id: string;
    title: string;
    difficulty: string;
    pattern: string;
    insight: string | null;
    repositoryUrl: string | null;
  }>;
  builds: Array<{
    id: string;
    title: string;
    area: string;
    proof: string | null;
    impact: string | null;
    repositoryUrl: string | null;
  }>;
  applications: Array<{
    id: string;
    company: string;
    role: string;
    status: string;
    note: string | null;
    roleUrl: string | null;
  }>;
};

export function WorkspaceProgressPage({
  data,
}: {
  data: ProgressPageData;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const totals = useMemo(
    () => ({
      dsa: data.history.reduce((sum, item) => sum + item.dsaCount, 0),
      builds: data.history.reduce((sum, item) => sum + item.buildCount, 0),
      applications: data.history.reduce((sum, item) => sum + item.appCount, 0),
    }),
    [data.history],
  );

  return (
    <motion.div variants={sectionStagger} initial="hidden" animate="show" className="grid gap-6">
      <motion.div variants={riseIn}>
        <PageHeader
          eyebrow="Progress"
          title="Keep analytics clean, focused, and separate from execution."
          description="Progress now owns charts, streaks, historical detail, and proof-of-work trends so you can review without being distracted by planner inputs or settings."
        />
      </motion.div>

      <motion.div variants={riseIn} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Current streak" value={`${data.metrics.currentStreak} days`} detail="Current visible consistency run." />
        <StatCard label="Max streak" value={`${data.metrics.maxStreak} days`} detail="Longest recorded run of consistent work." />
        <StatCard label="Total XP" value={data.metrics.totalXP} detail="Accumulated score from work and check-ins." />
        <StatCard label="90-day DSA" value={totals.dsa} detail="Problems logged across the current history window." />
        <StatCard label="90-day builds/apps" value={`${totals.builds}/${totals.applications}`} detail="Shipped build evidence and stored applications." />
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_0.85fr]">
        <SectionCard
          title="Execution graph"
          description="A compressed view of the last 90 days. Use it to spot consistency patterns and drill into a single day when needed."
        >
          <div className="grid gap-6">
            <CalendarHeatmap history={data.history} onSelect={setSelectedDate} />
            <ActivityBarChart data={data.history.slice(-21)} />
          </div>
        </SectionCard>

        <SectionCard
          title="Recent timeline"
          description="The newest entries stay visible here, while day-level inspection happens through the heatmap."
        >
          <div className="grid gap-3">
            {data.history
              .slice(-14)
              .reverse()
              .map((item) => (
                <button
                  key={item.dateKey}
                  type="button"
                  onClick={() => setSelectedDate(item.dateKey)}
                  className="soft-card text-left"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {format(parseISO(`${item.dateKey}T00:00:00`), "MMM d, yyyy")}
                      </div>
                      <div className="mt-2 text-sm text-[var(--muted)]">
                        {item.completedCount}/5 habit blocks · {item.dsaCount} DSA · {item.buildCount} builds · {item.appCount} applications
                      </div>
                    </div>
                    <div className="rounded-full border border-[var(--line)] bg-white/6 px-3 py-1 text-xs font-semibold text-white">
                      {Math.round((item.completedCount / 5) * 100)}%
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <SectionCard
          title="Recent proof of work"
          description="The latest DSA, build, and application evidence stays compact and easy to scan."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <CompactList
              title="DSA"
              icon={BrainCircuit}
              items={data.recentDsa.map((item) => ({
                id: item.id,
                title: item.title,
                subtitle: `${item.difficulty} · ${item.pattern}`,
                href: item.repositoryUrl ?? undefined,
              }))}
              emptyText="No DSA entries yet."
            />
            <CompactList
              title="Builds"
              icon={Rocket}
              items={data.recentBuilds.map((item) => ({
                id: item.id,
                title: item.title,
                subtitle: item.area,
                href: item.repositoryUrl ?? undefined,
              }))}
              emptyText="No build entries yet."
            />
            <CompactList
              title="Applications"
              icon={Briefcase}
              items={data.recentApplications.map((item) => ({
                id: item.id,
                title: `${item.role} at ${item.company}`,
                subtitle: item.status,
                href: item.roleUrl ?? undefined,
              }))}
              emptyText="No applications yet."
            />
          </div>
        </SectionCard>

        <SectionCard
          title="GitHub activity"
          description="Public GitHub activity is useful as supporting proof, but it stays secondary to the work you log directly."
        >
          {data.githubActivity.length ? (
            <div className="grid gap-3">
              {data.githubActivity.slice(0, 8).map((item) => (
                <div key={item.id} className="soft-card">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    <GitBranch className="size-3.5 text-white" />
                    {format(parseISO(item.createdAt), "MMM d")}
                  </div>
                  <div className="mt-3 text-sm font-medium text-white">{item.repoName}</div>
                  <div className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.type}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel
              title="No GitHub activity found"
              description="Add a GitHub profile in Settings if you want public activity to appear here as supporting signal."
            />
          )}
        </SectionCard>
      </div>

      <AnimatePresence>
        {selectedDate ? (
          <DailyDetailModal dateKey={selectedDate} onClose={() => setSelectedDate(null)} />
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function CalendarHeatmap({
  history,
  onSelect,
}: {
  history: ProgressPageData["history"];
  onSelect: (date: string) => void;
}) {
  const days = useMemo(() => {
    const map = new Map(history.map((item) => [item.dateKey, item]));
    const today = new Date();

    return Array.from({ length: 90 }, (_, index) => {
      const date = subDays(today, 89 - index);
      const dateKey = format(date, "yyyy-MM-dd");
      const entry = map.get(dateKey);
      const score = entry ? entry.completedCount + entry.dsaCount + entry.buildCount + entry.appCount : 0;
      const tone =
        score >= 10
          ? "bg-white"
          : score >= 6
            ? "bg-white/70"
            : score >= 3
              ? "bg-white/45"
              : score > 0
                ? "bg-white/20"
                : "bg-white/6";

      return { dateKey, tone };
    });
  }, [history]);

  return (
    <div className="flex justify-center overflow-x-auto">
      <div className="grid grid-flow-col grid-rows-7 gap-1.5 pb-1">
        {days.map((day) => (
          <button
            key={day.dateKey}
            type="button"
            onClick={() => onSelect(day.dateKey)}
            title={day.dateKey}
            className={cn("size-3.5 rounded-[4px] transition hover:scale-125 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2)]", day.tone)}
          />
        ))}
      </div>
    </div>
  );
}

function CompactList({
  title,
  icon: Icon,
  items,
  emptyText,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{ id: string; title: string; subtitle: string; href?: string }>;
  emptyText: string;
}) {
  return (
    <div className="soft-card">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        <Icon className="size-3.5 text-white" />
        {title}
      </div>
      <div className="mt-4 grid gap-3">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-[18px] border border-[var(--line)] bg-white/[0.02] px-3 py-3">
              <div className="text-sm font-medium text-white">{item.title}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">{item.subtitle}</div>
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-white hover:underline"
                >
                  Open
                  <ArrowUpRight className="size-3.5" />
                </a>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-[18px] border border-dashed border-[var(--line)] bg-white/[0.02] px-3 py-4 text-sm text-[var(--muted)]">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

function DailyDetailModal({
  dateKey,
  onClose,
}: {
  dateKey: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<DailyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void postJson<DailyDetail>(`/api/dashboard/history?date=${dateKey}`)
      .then((payload) => {
        if (!active) {
          return;
        }

        setDetail(payload);
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setDetail(null);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dateKey]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        className="glass-card w-full max-w-3xl rounded-[30px] p-6 sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Daily detail
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {format(parseISO(`${dateKey}T00:00:00`), "EEEE, MMMM d")}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--line)] bg-white/6 p-2 text-[var(--muted)] transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {loading ? (
          <div className="rounded-[22px] border border-[var(--line)] bg-white/[0.03] px-4 py-10 text-center text-sm text-[var(--muted)]">
            Loading daily detail...
          </div>
        ) : !detail ? (
          <div className="rounded-[22px] border border-[var(--line)] bg-white/[0.03] px-4 py-10 text-center text-sm text-[var(--muted)]">
            Could not load detail for this day.
          </div>
        ) : (
          <div className="grid gap-5">
            {detail.aiSummary ? (
              <div className="rounded-[22px] border border-[var(--line)] bg-white/[0.03] px-4 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  AI summary
                </div>
                <div className="mt-3 text-sm leading-7 text-white">{detail.aiSummary}</div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="soft-card">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Completed blocks
                </div>
                <div className="mt-4 grid gap-2">
                  {Object.entries(detail.checkins)
                    .filter(([, value]) => value)
                    .map(([label]) => (
                      <div key={label} className="text-sm text-white">
                        {label.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase())}
                      </div>
                    ))}
                  {!Object.values(detail.checkins).some(Boolean) ? (
                    <div className="text-sm text-[var(--muted)]">No blocks were completed that day.</div>
                  ) : null}
                </div>
              </div>

              <div className="soft-card">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Notes
                </div>
                <div className="mt-3 text-sm leading-7 text-white">
                  {detail.note || "No end-of-day note was saved."}
                </div>
                <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Tomorrow task
                </div>
                <div className="mt-2 text-sm leading-7 text-white">
                  {detail.tomorrowTask || "No next task was saved."}
                </div>
              </div>
            </div>

            <DetailList title="DSA" icon={BrainCircuit} items={detail.dsa.map((item) => ({
              id: item.id,
              title: item.title,
              subtitle: `${item.difficulty} · ${item.pattern}`,
              body: item.insight || "No insight saved.",
              href: item.repositoryUrl ?? undefined,
            }))} />
            <DetailList title="Builds" icon={Rocket} items={detail.builds.map((item) => ({
              id: item.id,
              title: item.title,
              subtitle: item.area,
              body: item.impact || item.proof || "No build note saved.",
              href: item.repositoryUrl ?? undefined,
            }))} />
            <DetailList title="Applications" icon={Briefcase} items={detail.applications.map((item) => ({
              id: item.id,
              title: `${item.role} at ${item.company}`,
              subtitle: item.status,
              body: item.note || "No application note saved.",
              href: item.roleUrl ?? undefined,
            }))} />
          </div>
        )}
      </motion.div>
    </div>
  );
}

function DetailList({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{ id: string; title: string; subtitle: string; body: string; href?: string }>;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        <Icon className="size-3.5 text-white" />
        {title}
      </div>
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={item.id} className="soft-card">
            <div className="text-sm font-medium text-white">{item.title}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">{item.subtitle}</div>
            <div className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.body}</div>
            {item.href ? (
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/6 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
              >
                Open link
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
