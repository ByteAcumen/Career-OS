"use client";

import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  Briefcase,
  CheckCircle2,
  Clock3,
  Database,
  Flame,
  GitBranch,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  RefreshCcw,
  Rocket,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import type { CheckinKey, DashboardData } from "@/lib/types";
import { cn, toDateKey } from "@/lib/utils";

type SettingsForm = DashboardData["settings"];
type ScheduleItem = [string, string, string];

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "today", label: "Today", icon: Target },
  { id: "history", label: "History", icon: Activity },
  { id: "settings", label: "Settings", icon: Database },
] as const;

const dsaPatterns = [
  "Arrays and Hashing",
  "Two Pointers",
  "Sliding Window",
  "Stack",
  "Binary Search",
  "Trees",
  "Graphs",
  "Heap",
  "Dynamic Programming",
  "Backtracking",
  "Other",
];

const statuses = [
  "Applied",
  "Referral asked",
  "OA scheduled",
  "Interview",
  "Rejected",
] as const;

const buildAreas = ["React", "NestJS", "TypeScript", "AI", "System Design"] as const;

const checkinCards: Array<[CheckinKey, string, string]> = [
  ["morningRevision", "Morning revision", "Mandatory recall before office"],
  ["microRevision", "Micro revision", "Commute or lunch flashcards"],
  ["deepWork", "Deep work", "Main focus block after office"],
  ["supportBlock", "Support block", "Applications or second DSA pass"],
  ["shutdownReview", "Shutdown review", "Close the day properly"],
];

export function TrackerDashboard() {
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]["id"]>("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [toast, setToast] = useState("");
  const [isPending, startUiRefresh] = useTransition();
  const [action, setAction] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsForm | null>(null);
  const [dsaForm, setDsaForm] = useState({
    title: "",
    difficulty: "Medium",
    pattern: "Sliding Window",
    insight: "",
    repositoryUrl: "",
  });
  const [buildForm, setBuildForm] = useState({
    title: "",
    area: "React",
    proof: "",
    impact: "",
    repositoryUrl: "",
  });
  const [applicationForm, setApplicationForm] = useState({
    company: "",
    role: "",
    status: "Applied",
    note: "",
    roleUrl: "",
  });
  const [reviewForm, setReviewForm] = useState({
    note: "",
    tomorrowTask: "",
  });

  const todayKey = data?.today.dateKey ?? toDateKey();

  const schedule = useMemo<ScheduleItem[]>(() => {
    const day = new Date(`${todayKey}T00:00:00`).getDay();
    const weekend = day === 0 || day === 6;
    const weekendDsa = settings?.weekendDsaMinutes ?? 150;
    const weekendBuild = settings?.weekendBuildMinutes ?? 180;

    if (weekend) {
      return [
        ["7:30 AM", "Morning revision", "Mandatory memory refresh and pattern recall."],
        [
          "9:30 AM",
          `DSA block (${weekendDsa} min)`,
          "Timed medium plus one repeat pattern solve.",
        ],
        [
          "2:00 PM",
          `Build block (${weekendBuild} min)`,
          "Ship one visible feature to GitHub.",
        ],
        ["5:30 PM", "Applications", "Apply, follow up, or tighten resume bullets."],
        ["8:30 PM", "Weekly review", "Reset next week before sleep."],
      ];
    }

    return [
      ["5:50 AM", "Morning revision", "Non-negotiable daily recall before office."],
      ["Commute", "Micro revision", "Flashcards or pattern replay only."],
      ["8:45 PM", "Deep work", "DSA or product work depending on the day."],
      ["10:05 PM", "Support block", "Applications or DSA reinforcement."],
      ["10:40 PM", "Shutdown review", "Save note and lock tomorrow's first task."],
    ];
  }, [settings?.weekendBuildMinutes, settings?.weekendDsaMinutes, todayKey]);

  async function loadDashboard() {
    const payload = await postJson<DashboardData>("/api/dashboard", undefined, {
      method: "GET",
    });
    setData(payload);
    setSettings(payload.settings);
    setReviewForm({
      note: payload.today.note,
      tomorrowTask: payload.today.tomorrowTask,
    });
  }

  function refresh() {
    startUiRefresh(() => {
      void loadDashboard().catch((error: unknown) => {
        setToast(error instanceof Error ? error.message : "Refresh failed");
      });
    });
  }

  async function runAction<T>(
    label: string,
    request: () => Promise<T>,
    successMessage: string,
  ) {
    try {
      setAction(label);
      await request();
      setToast(successMessage);
      refresh();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setAction(null);
    }
  }

  useEffect(() => {
    void loadDashboard().catch((error: unknown) => {
      setToast(error instanceof Error ? error.message : "Could not load dashboard");
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!data || !settings) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="glass-card flex items-center gap-3 rounded-full px-5 py-3 text-sm text-[var(--muted)]">
          <LoaderCircle className="size-4 animate-spin" />
          Loading your career operating system...
        </div>
      </div>
    );
  }

  const metricCards = [
    {
      label: "Revision streak",
      value: data.metrics.revisionStreak,
      icon: Flame,
      tone: "bg-[var(--gold-soft)] text-amber-800",
    },
    {
      label: "Week DSA",
      value: data.metrics.weekDsa,
      icon: BrainCircuit,
      tone: "bg-[var(--teal-soft)] text-teal-800",
    },
    {
      label: "Week apps",
      value: data.metrics.weekApplications,
      icon: Briefcase,
      tone: "bg-[var(--rose-soft)] text-rose-800",
    },
    {
      label: "Week builds",
      value: data.metrics.weekBuilds,
      icon: Rocket,
      tone: "bg-[var(--navy-soft)] text-sky-900",
    },
    {
      label: "Today score",
      value: `${data.metrics.todayScore}%`,
      icon: CheckCircle2,
      tone: "bg-[var(--green-soft)] text-emerald-800",
    },
  ];

  return (
    <main className="relative overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card mb-5 overflow-hidden rounded-[32px] p-6 sm:p-8"
        >
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--gold-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-900">
                Career OS for ByteAcumen
              </div>
              <h1 className="heading-font max-w-3xl text-4xl leading-[0.95] sm:text-5xl lg:text-6xl">
                Proper tracker. Proper storage. Proper momentum.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                This app stores your study data in a real database, keeps GitHub and
                Google Sheets connected, and adds an AI coach layer from the backend
                so secrets stay safe. It is built around your weekday office reality
                and your stronger weekend study windows.
              </p>
              <div className="mt-4 inline-flex max-w-2xl rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm text-[var(--ink)]">
                {settings.primaryGoal}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <QuickLink href={settings.githubUrl} icon={GitBranch} label="GitHub" />
                <QuickLink href={settings.sheetUrl} icon={Briefcase} label="Job sheet" />
                <QuickLink href={settings.resumeUrl} icon={Link2} label="Resume" />
                <QuickLink href={settings.leetcodeUrl} icon={Target} label="LeetCode" />
              </div>
            </div>

            <div className="grid gap-3">
              <StatusCard
                title="Connected stack"
                body="Next.js frontend, SQLite-backed storage, API routes, Google Sheet sync, and a switchable AI coach."
                icon={Database}
              />
              <StatusCard
                title="Weekend loadout"
                body={`${settings.weekendDsaMinutes} minutes for DSA and ${settings.weekendBuildMinutes} minutes for build work are reserved for your heavier weekend sessions.`}
                icon={Clock3}
              />
              <StatusCard
                title="Pending sheet sync"
                body={`${data.metrics.pendingApplications} application entries still need to be pushed to your Google Sheet.`}
                icon={RefreshCcw}
              />
            </div>
          </div>
        </motion.section>

        <div className="mb-5 flex flex-wrap gap-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition",
                  activeTab === tab.id
                    ? "border-transparent bg-[var(--ink)] text-white"
                    : "border-[var(--line)] bg-white/70 text-[var(--muted)] hover:bg-white",
                )}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        >
          {metricCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card rounded-[24px] p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", card.tone)}>
                    {card.label}
                  </span>
                  <Icon className="size-4 text-[var(--muted)]" />
                </div>
                <div className="text-3xl font-semibold">{card.value}</div>
              </motion.div>
            );
          })}
        </motion.div>

        {activeTab === "overview" && (
          <OverviewTab
            data={data}
            settings={settings}
            schedule={schedule}
            runAction={runAction}
          />
        )}
        {activeTab === "today" && (
          <TodayTab
            data={data}
            todayKey={todayKey}
            reviewForm={reviewForm}
            setReviewForm={setReviewForm}
            dsaForm={dsaForm}
            setDsaForm={setDsaForm}
            buildForm={buildForm}
            setBuildForm={setBuildForm}
            applicationForm={applicationForm}
            setApplicationForm={setApplicationForm}
            runAction={runAction}
          />
        )}
        {activeTab === "history" && <HistoryTab data={data} />}
        {activeTab === "settings" && (
          <SettingsTab
            settings={settings}
            setSettings={setSettings}
            runAction={runAction}
          />
        )}

        {toast ? (
          <div className="fixed bottom-5 right-5 rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-white shadow-xl">
            {toast}
          </div>
        ) : null}
        {isPending || action ? (
          <div className="fixed bottom-5 left-5 rounded-full bg-white/90 px-4 py-2 text-sm text-[var(--muted)] shadow-xl">
            {action ? `Working on ${action}...` : "Refreshing..."}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function OverviewTab({
  data,
  settings,
  schedule,
  runAction,
}: {
  data: DashboardData;
  settings: SettingsForm;
  schedule: ScheduleItem[];
  runAction: <T>(label: string, request: () => Promise<T>, successMessage: string) => Promise<void>;
}) {
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="grid gap-5">
        <Panel
          title="AI coach"
          subtitle="Server-side guidance based on today's real activity."
          action={
            <button
              disabled={!data.integrations.aiReady}
              onClick={() =>
                runAction(
                  "coach",
                  () => postJson("/api/ai/coach", undefined, { method: "POST" }),
                  "AI coach refreshed.",
                )
              }
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium text-white",
                data.integrations.aiReady
                  ? "bg-[var(--teal)]"
                  : "cursor-not-allowed bg-slate-400",
              )}
            >
              {data.integrations.aiReady
                ? `Run ${settings.aiProvider} coach`
                : `Connect ${settings.aiProvider} first`}
            </button>
          }
        >
          {data.today.ai ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <InsightCard label="Summary" value={data.today.ai.summary} />
              <InsightCard label="Biggest risk" value={data.today.ai.biggestRisk} />
              <InsightCard label="Tomorrow morning" value={data.today.ai.morningPlan} />
              <InsightCard label="Night deep work" value={data.today.ai.nightPlan} />
              <InsightCard label="Application block" value={data.today.ai.applyPlan} />
              <InsightCard label="One thing to cut" value={data.today.ai.oneCut} />
            </div>
          ) : (
            <EmptyState
              text={
                data.integrations.aiReady
                  ? "No AI reflection saved yet. Generate your coach update once today's data is logged."
                  : `AI is not connected yet. Add the ${settings.aiProvider.toUpperCase()} key in the server .env file to enable coaching.`
              }
            />
          )}
        </Panel>

        <Panel title="14-day momentum" subtitle="Progress looks better when the data survives each day.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.history.map((item) => (
              <div key={item.dateKey} className="soft-card">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                  {format(parseISO(`${item.dateKey}T00:00:00`), "EEE dd")}
                </div>
                <div className="mt-3 h-2 rounded-full bg-[var(--gold-soft)]">
                  <div
                    className="h-2 rounded-full bg-[var(--teal)]"
                    style={{ width: `${(item.completedCount / 5) * 100}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[var(--muted)]">
                  <span>DSA {item.dsaCount}</span>
                  <span>Build {item.buildCount}</span>
                  <span>Apps {item.appCount}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Recent proof of work" subtitle="The output recruiters can actually believe.">
          <div className="grid gap-4 lg:grid-cols-3">
            <LogColumn
              title="DSA"
              items={data.recentDsa.map((item) => ({
                title: item.title,
                subtitle: `${item.difficulty} - ${item.pattern}`,
                meta: item.insight || "Insight not added yet.",
                href: item.repositoryUrl ?? undefined,
              }))}
            />
            <LogColumn
              title="Builds"
              items={data.recentBuilds.map((item) => ({
                title: item.title,
                subtitle: item.area,
                meta: item.impact || item.proof || "Proof not added yet.",
                href: item.repositoryUrl ?? undefined,
              }))}
            />
            <LogColumn
              title="Applications"
              items={data.recentApplications.map((item) => ({
                title: `${item.company} - ${item.role}`,
                subtitle: item.status,
                meta: item.syncedToSheet ? "Sheet synced" : "Pending Google Sheet sync",
                href: item.roleUrl ?? undefined,
              }))}
            />
          </div>
        </Panel>
      </div>

      <div className="grid gap-5">
        <Panel title="Yesterday snapshot" subtitle="Carry context forward instead of resetting daily.">
          {data.previousDay ? (
            <div className="space-y-3 text-sm text-[var(--muted)]">
              <StatLine label="Date" value={data.previousDay.dateKey} />
              <StatLine label="DSA logs" value={String(data.previousDay.dsaCount)} />
              <StatLine label="Build logs" value={String(data.previousDay.buildCount)} />
              <StatLine label="Applications" value={String(data.previousDay.appCount)} />
              <div className="soft-card text-[var(--ink)]">
                {data.previousDay.note || "No note was saved yesterday."}
              </div>
            </div>
          ) : (
            <EmptyState text="No previous-day record yet. Save daily reviews for two days and this becomes useful immediately." />
          )}
        </Panel>

        <Panel
          title="Connected apps"
          subtitle="GitHub proof and Google Sheet reporting in one place."
          action={
            <button
              disabled={!data.integrations.googleSheetsReady}
              onClick={() =>
                runAction(
                  "sheet-sync",
                  () => postJson("/api/applications/sync", undefined, { method: "POST" }),
                  "Pending applications synced.",
                )
              }
              className={cn(
                "rounded-full border border-[var(--line)] px-4 py-2 text-sm",
                data.integrations.googleSheetsReady
                  ? "bg-white/70"
                  : "cursor-not-allowed bg-slate-100 text-slate-500",
              )}
            >
              {data.integrations.googleSheetsReady ? "Sync applications" : "Add Apps Script URL first"}
            </button>
          }
        >
          <div className="space-y-4">
            <div className="soft-card">
              <div className="flex items-center gap-2 text-sm font-medium">
                <GitBranch className="size-4" />
                ByteAcumen public activity
              </div>
              <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                {data.githubActivity.length ? (
                  data.githubActivity.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-[var(--line)] px-3 py-2">
                      <div className="font-medium text-[var(--ink)]">{item.type}</div>
                      <div>{item.repoName}</div>
                    </div>
                  ))
                ) : (
                  <EmptyState text="No public GitHub activity was returned right now." />
                )}
              </div>
            </div>

            <div className="soft-card text-sm text-[var(--muted)]">
              <div className="font-medium text-[var(--ink)]">Google Sheet sync status</div>
              <div className="mt-2">
                {data.metrics.pendingApplications} pending and {data.metrics.syncedApplications} synced overall.
              </div>
              <div className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                {settings.googleAppsScriptUrl
                  ? "Apps Script connected"
                  : "Apps Script URL not configured yet"}
              </div>
            </div>

            <div className="soft-card text-sm text-[var(--muted)]">
              <div className="font-medium text-[var(--ink)]">AI providers</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["openai", "gemini", "openrouter"] as const).map((provider) => (
                  <span
                    key={provider}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
                      data.integrations.providers[provider]
                        ? "bg-[var(--teal-soft)] text-teal-900"
                        : "bg-slate-200 text-slate-600",
                    )}
                  >
                    {provider}
                    {settings.aiProvider === provider ? " active" : ""}
                  </span>
                ))}
              </div>
            </div>

            <div className="soft-card text-sm text-[var(--muted)]">
              <div className="font-medium text-[var(--ink)]">Profiles linked</div>
              <div className="mt-2 flex flex-wrap gap-3">
                <a href={settings.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--teal)]">
                  GitHub
                  <ArrowUpRight className="size-4" />
                </a>
                <a href={settings.leetcodeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--teal)]">
                  LeetCode
                  <ArrowUpRight className="size-4" />
                </a>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Today's schedule" subtitle="Compact on weekdays. Heavier on weekends.">
          <div className="space-y-3">
            {schedule.map(([time, title, copy]) => (
              <div key={`${time}-${title}`} className="soft-card">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                  <Clock3 className="size-3.5" />
                  {time}
                </div>
                <div className="mt-2 font-medium">{title}</div>
                <div className="mt-1 text-sm text-[var(--muted)]">{copy}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function TodayTab({
  data,
  todayKey,
  reviewForm,
  setReviewForm,
  dsaForm,
  setDsaForm,
  buildForm,
  setBuildForm,
  applicationForm,
  setApplicationForm,
  runAction,
}: {
  data: DashboardData;
  todayKey: string;
  reviewForm: { note: string; tomorrowTask: string };
  setReviewForm: React.Dispatch<React.SetStateAction<{ note: string; tomorrowTask: string }>>;
  dsaForm: { title: string; difficulty: string; pattern: string; insight: string; repositoryUrl: string };
  setDsaForm: React.Dispatch<
    React.SetStateAction<{
      title: string;
      difficulty: string;
      pattern: string;
      insight: string;
      repositoryUrl: string;
    }>
  >;
  buildForm: { title: string; area: string; proof: string; impact: string; repositoryUrl: string };
  setBuildForm: React.Dispatch<
    React.SetStateAction<{
      title: string;
      area: string;
      proof: string;
      impact: string;
      repositoryUrl: string;
    }>
  >;
  applicationForm: { company: string; role: string; status: string; note: string; roleUrl: string };
  setApplicationForm: React.Dispatch<
    React.SetStateAction<{
      company: string;
      role: string;
      status: string;
      note: string;
      roleUrl: string;
    }>
  >;
  runAction: <T>(label: string, request: () => Promise<T>, successMessage: string) => Promise<void>;
}) {
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <Panel title="Daily execution" subtitle="Track the day in the same place you review it.">
        <div className="grid gap-4">
          {checkinCards.map(([key, label, copy]) => (
            <button
              key={key}
              onClick={() =>
                runAction(
                  `checkin-${key}`,
                  () =>
                    postJson("/api/checkins", {
                      dateKey: todayKey,
                      key,
                      value: !data.today.checkins[key],
                    }),
                  `${label} updated.`,
                )
              }
              className={cn(
                "flex items-center justify-between rounded-[24px] border p-4 text-left transition",
                data.today.checkins[key]
                  ? "border-transparent bg-[var(--teal)] text-white"
                  : "border-[var(--line)] bg-white/70 hover:bg-white",
              )}
            >
              <div>
                <div className="font-medium">{label}</div>
                <div
                  className={cn(
                    "mt-1 text-sm",
                    data.today.checkins[key] ? "text-white/80" : "text-[var(--muted)]",
                  )}
                >
                  {copy}
                </div>
              </div>
              <CheckCircle2 className="size-5" />
            </button>
          ))}

          <div className="rounded-[28px] border border-[var(--line)] bg-white/70 p-5">
            <div className="grid gap-3">
              <textarea
                value={reviewForm.note}
                onChange={(event) =>
                  setReviewForm((current) => ({ ...current, note: event.target.value }))
                }
                className="field-area"
                placeholder="What blocked you today? What should tomorrow's revision begin with?"
              />
              <input
                value={reviewForm.tomorrowTask}
                onChange={(event) =>
                  setReviewForm((current) => ({ ...current, tomorrowTask: event.target.value }))
                }
                className="field"
                placeholder="Tomorrow's first task"
              />
              <button
                onClick={() =>
                  runAction(
                    "review",
                    () =>
                      postJson("/api/checkins", {
                        dateKey: todayKey,
                        note: reviewForm.note,
                        tomorrowTask: reviewForm.tomorrowTask,
                      }),
                    "Daily review saved.",
                  )
                }
                className="rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-medium text-white"
              >
                Save daily review
              </button>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5">
        <Panel title="Log DSA" subtitle="Store each solved problem with pattern and insight.">
          <EntryForm
            fields={[
              <input
                key="title"
                value={dsaForm.title}
                onChange={(event) =>
                  setDsaForm((current) => ({ ...current, title: event.target.value }))
                }
                className="field"
                placeholder="Problem title"
              />,
              <div key="meta" className="grid gap-3 sm:grid-cols-2">
                <select
                  value={dsaForm.difficulty}
                  onChange={(event) =>
                    setDsaForm((current) => ({ ...current, difficulty: event.target.value }))
                  }
                  className="field"
                >
                  {["Easy", "Medium", "Hard"].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  value={dsaForm.pattern}
                  onChange={(event) =>
                    setDsaForm((current) => ({ ...current, pattern: event.target.value }))
                  }
                  className="field"
                >
                  {dsaPatterns.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>,
              <textarea
                key="insight"
                value={dsaForm.insight}
                onChange={(event) =>
                  setDsaForm((current) => ({ ...current, insight: event.target.value }))
                }
                className="field-area"
                placeholder="Key insight or mistake"
              />,
              <input
                key="repo"
                value={dsaForm.repositoryUrl}
                onChange={(event) =>
                  setDsaForm((current) => ({ ...current, repositoryUrl: event.target.value }))
                }
                className="field"
                placeholder="GitHub link for this solution"
              />,
            ]}
            submitLabel="Save DSA entry"
            onSubmit={() =>
              runAction(
                "dsa-entry",
                async () => {
                  await postJson("/api/dsa", { dateKey: todayKey, ...dsaForm });
                  setDsaForm({
                    title: "",
                    difficulty: "Medium",
                    pattern: "Sliding Window",
                    insight: "",
                    repositoryUrl: "",
                  });
                },
                "DSA entry saved.",
              )
            }
          />
        </Panel>

        <Panel title="Log build work" subtitle="Capture shipped work, not just intentions.">
          <EntryForm
            fields={[
              <input
                key="title"
                value={buildForm.title}
                onChange={(event) =>
                  setBuildForm((current) => ({ ...current, title: event.target.value }))
                }
                className="field"
                placeholder="Feature or task title"
              />,
              <select
                key="area"
                value={buildForm.area}
                onChange={(event) =>
                  setBuildForm((current) => ({ ...current, area: event.target.value }))
                }
                className="field"
              >
                {buildAreas.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>,
              <textarea
                key="proof"
                value={buildForm.proof}
                onChange={(event) =>
                  setBuildForm((current) => ({ ...current, proof: event.target.value }))
                }
                className="field-area"
                placeholder="What did you implement?"
              />,
              <textarea
                key="impact"
                value={buildForm.impact}
                onChange={(event) =>
                  setBuildForm((current) => ({ ...current, impact: event.target.value }))
                }
                className="field-area"
                placeholder="Why does this matter?"
              />,
              <input
                key="repo"
                value={buildForm.repositoryUrl}
                onChange={(event) =>
                  setBuildForm((current) => ({ ...current, repositoryUrl: event.target.value }))
                }
                className="field"
                placeholder="GitHub or deployed proof URL"
              />,
            ]}
            submitLabel="Save build entry"
            onSubmit={() =>
              runAction(
                "build-entry",
                async () => {
                  await postJson("/api/builds", { dateKey: todayKey, ...buildForm });
                  setBuildForm({
                    title: "",
                    area: "React",
                    proof: "",
                    impact: "",
                    repositoryUrl: "",
                  });
                },
                "Build entry saved.",
              )
            }
          />
        </Panel>

        <Panel title="Log application" subtitle="This is the entry that can sync to Google Sheets.">
          <EntryForm
            fields={[
              <input
                key="company"
                value={applicationForm.company}
                onChange={(event) =>
                  setApplicationForm((current) => ({ ...current, company: event.target.value }))
                }
                className="field"
                placeholder="Company"
              />,
              <input
                key="role"
                value={applicationForm.role}
                onChange={(event) =>
                  setApplicationForm((current) => ({ ...current, role: event.target.value }))
                }
                className="field"
                placeholder="Role"
              />,
              <select
                key="status"
                value={applicationForm.status}
                onChange={(event) =>
                  setApplicationForm((current) => ({ ...current, status: event.target.value }))
                }
                className="field"
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>,
              <textarea
                key="note"
                value={applicationForm.note}
                onChange={(event) =>
                  setApplicationForm((current) => ({ ...current, note: event.target.value }))
                }
                className="field-area"
                placeholder="Referral, recruiter name, follow-up, or result"
              />,
              <input
                key="url"
                value={applicationForm.roleUrl}
                onChange={(event) =>
                  setApplicationForm((current) => ({ ...current, roleUrl: event.target.value }))
                }
                className="field"
                placeholder="Job link"
              />,
            ]}
            submitLabel="Save application"
            onSubmit={() =>
              runAction(
                "application-entry",
                async () => {
                  await postJson("/api/applications", { dateKey: todayKey, ...applicationForm });
                  setApplicationForm({
                    company: "",
                    role: "",
                    status: "Applied",
                    note: "",
                    roleUrl: "",
                  });
                },
                "Application saved.",
              )
            }
          />
        </Panel>
      </div>
    </section>
  );
}

function HistoryTab({ data }: { data: DashboardData }) {
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
      <Panel title="Consistency history" subtitle="You need momentum more than motivation.">
        <div className="space-y-3">
          {data.history
            .slice()
            .reverse()
            .map((item) => (
              <div key={item.dateKey} className="soft-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{item.dateKey}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      {item.completedCount}/5 habit blocks completed
                    </div>
                  </div>
                  <div className="rounded-full bg-[var(--gold-soft)] px-3 py-1 text-xs font-semibold text-amber-900">
                    Score {Math.round((item.completedCount / 5) * 100)}%
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-[var(--muted)]">
                  <div>DSA {item.dsaCount}</div>
                  <div>Build {item.buildCount}</div>
                  <div>Apps {item.appCount}</div>
                </div>
              </div>
            ))}
        </div>
      </Panel>

      <Panel title="What this app stores" subtitle="Your data now lives beyond a single browser tab.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            title="Daily snapshots"
            body="Morning revision, deep work, shutdown review, notes, and tomorrow's first task are all preserved."
            icon={CheckCircle2}
          />
          <FeatureCard
            title="DSA log"
            body="Each problem stores title, difficulty, pattern, repo link, and insight so revision gets smarter."
            icon={BrainCircuit}
          />
          <FeatureCard
            title="Build log"
            body="Every useful frontend, backend, AI, or system-design task can become visible portfolio proof."
            icon={Rocket}
          />
          <FeatureCard
            title="Application history"
            body="Applications stay in the database and can sync outward to Google Sheets instead of getting lost."
            icon={Briefcase}
          />
        </div>
      </Panel>
    </section>
  );
}

function SettingsTab({
  settings,
  setSettings,
  runAction,
}: {
  settings: SettingsForm;
  setSettings: React.Dispatch<React.SetStateAction<SettingsForm | null>>;
  runAction: <T>(label: string, request: () => Promise<T>, successMessage: string) => Promise<void>;
}) {
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <Panel title="App settings" subtitle="Customize the app without touching code.">
        <div className="grid gap-4">
          <textarea
            value={settings.primaryGoal}
            onChange={(event) =>
              setSettings((current) => (current ? { ...current, primaryGoal: event.target.value } : current))
            }
            className="field-area"
            placeholder="Primary goal"
          />
          <input
            value={settings.sheetUrl}
            onChange={(event) =>
              setSettings((current) => (current ? { ...current, sheetUrl: event.target.value } : current))
            }
            className="field"
            placeholder="Google Sheet URL"
          />
          <input
            value={settings.resumeUrl}
            onChange={(event) =>
              setSettings((current) => (current ? { ...current, resumeUrl: event.target.value } : current))
            }
            className="field"
            placeholder="Resume URL"
          />
          <input
            value={settings.githubUrl}
            onChange={(event) =>
              setSettings((current) => (current ? { ...current, githubUrl: event.target.value } : current))
            }
            className="field"
            placeholder="GitHub profile URL"
          />
          <input
            value={settings.leetcodeUrl}
            onChange={(event) =>
              setSettings((current) => (current ? { ...current, leetcodeUrl: event.target.value } : current))
            }
            className="field"
            placeholder="LeetCode profile URL"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <select
              value={settings.aiProvider}
              onChange={(event) =>
                setSettings((current) =>
                  current
                    ? {
                        ...current,
                        aiProvider: event.target.value as SettingsForm["aiProvider"],
                        openAiModel:
                          event.target.value === "gemini"
                            ? "gemini-2.5-flash"
                            : event.target.value === "openrouter"
                              ? "openai/gpt-4o-mini"
                              : "gpt-4o-mini",
                      }
                    : current,
                )
              }
              className="field"
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="openrouter">OpenRouter</option>
            </select>
            <input
              value={settings.openAiModel}
              onChange={(event) =>
                setSettings((current) => (current ? { ...current, openAiModel: event.target.value } : current))
              }
              className="field"
              placeholder="AI model"
            />
          </div>
          <input
            value={settings.googleAppsScriptUrl}
            onChange={(event) =>
              setSettings((current) =>
                current ? { ...current, googleAppsScriptUrl: event.target.value } : current,
              )
            }
            className="field"
            placeholder="Google Apps Script URL"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="number"
              value={settings.weekendDsaMinutes}
              onChange={(event) =>
                setSettings((current) =>
                  current ? { ...current, weekendDsaMinutes: Number(event.target.value) } : current,
                )
              }
              className="field"
              placeholder="Weekend DSA minutes"
            />
            <input
              type="number"
              value={settings.weekendBuildMinutes}
              onChange={(event) =>
                setSettings((current) =>
                  current ? { ...current, weekendBuildMinutes: Number(event.target.value) } : current,
                )
              }
              className="field"
              placeholder="Weekend build minutes"
            />
          </div>
          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--gold-soft)] px-4 py-3 text-sm text-amber-950">
            Weekend template reserves {settings.weekendDsaMinutes + settings.weekendBuildMinutes} focused
            minutes across DSA and project work.
          </div>
          <button
            onClick={() =>
              runAction(
                "settings",
                () => postJson("/api/settings", settings),
                "Settings saved.",
              )
            }
            className="rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-medium text-white"
          >
            Save settings
          </button>
        </div>
      </Panel>

      <Panel title="Recommended architecture" subtitle="The stack I would actually recommend for you.">
        <div className="space-y-4 text-sm leading-7 text-[var(--muted)]">
          <div className="soft-card">
            <strong className="text-[var(--ink)]">AI API</strong>
            <p className="mt-2">
              Keep the AI calls on the backend and use provider switching based on cost and reliability.
              OpenRouter is the best day-to-day default, Gemini is a strong backup, and OpenAI is the
              premium structured-output option when you want it.
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              Switch providers from Settings without exposing secrets in the browser.
            </p>
          </div>
          <div className="soft-card">
            <strong className="text-[var(--ink)]">Frontend</strong>
            <p className="mt-2">
              Next.js is already set up so the tracker can stay fast, customizable, and easy to
              deploy on Vercel when you are ready to move online.
            </p>
          </div>
          <div className="soft-card">
            <strong className="text-[var(--ink)]">Database</strong>
            <p className="mt-2">
              The app is already storing data in SQLite. For proper online storage later, move this
              data layer to PostgreSQL on Neon, Supabase, or Vercel Postgres.
            </p>
          </div>
          <div className="soft-card">
            <strong className="text-[var(--ink)]">Google Sheet bridge</strong>
            <p className="mt-2">
              Google Apps Script is still the simplest reliable way to push application rows into your
              existing Sheet while keeping the database as the true source of record.
            </p>
          </div>
        </div>
      </Panel>
    </section>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-card rounded-[28px] p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/75 px-4 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:-translate-y-0.5 hover:bg-white"
    >
      <Icon className="size-4" />
      {label}
      <ArrowUpRight className="size-4 text-[var(--muted)]" />
    </a>
  );
}

function StatusCard({
  title,
  body,
  icon: Icon,
}: {
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-[var(--teal)]" />
        {title}
      </div>
      <p className="text-sm leading-7 text-[var(--muted)]">{body}</p>
    </div>
  );
}

function InsightCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="soft-card">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
      <div className="mt-3 text-sm leading-7 text-[var(--ink)]">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[var(--line)] bg-white/50 px-4 py-5 text-sm text-[var(--muted)]">
      {text}
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-[var(--line)] bg-white/60 px-4 py-3">
      <span>{label}</span>
      <span className="font-medium text-[var(--ink)]">{value}</span>
    </div>
  );
}

function LogColumn({
  title,
  items,
}: {
  title: string;
  items: Array<{ title: string; subtitle: string; meta: string; href?: string }>;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-white/70 p-4">
      <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {title}
      </div>
      <div className="space-y-3">
        {items.length ? (
          items.map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              className="rounded-[18px] border border-[var(--line)] bg-white/80 p-3"
            >
              <div className="font-medium text-[var(--ink)]">{item.title}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">{item.subtitle}</div>
              <div className="mt-2 text-sm leading-6 text-[var(--ink)]">{item.meta}</div>
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--teal)]"
                >
                  Open link
                  <ArrowUpRight className="size-4" />
                </a>
              ) : null}
            </div>
          ))
        ) : (
          <EmptyState text={`No ${title.toLowerCase()} entries yet.`} />
        )}
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  body,
  icon: Icon,
}: {
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="soft-card">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-[var(--teal)]" />
        {title}
      </div>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{body}</p>
    </div>
  );
}

function EntryForm({
  fields,
  submitLabel,
  onSubmit,
}: {
  fields: React.ReactNode[];
  submitLabel: string;
  onSubmit: () => void;
}) {
  return (
    <div className="grid gap-3">
      {fields}
      <button
        onClick={onSubmit}
        className="rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-medium text-white"
      >
        {submitLabel}
      </button>
    </div>
  );
}

async function postJson<T>(
  url: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...init,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string; ok?: boolean }
    | T
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? payload.message
        : "Request failed";
    throw new Error(message || "Request failed");
  }

  return payload as T;
}
