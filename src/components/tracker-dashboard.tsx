"use client";

import { format, parseISO, subDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Bell,
  BrainCircuit,
  Briefcase,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Database,
  Flame,
  GitBranch,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  Pause,
  Play,
  RefreshCcw,
  RotateCcw,
  Rocket,
  Target,
  Sparkles,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

import { getWeaknessCurriculumAction, predictMatchAction } from "@/app/actions";
import { authClient } from "@/lib/auth-client";
import { getScheduleForDate } from "@/lib/schedule";
import type { CheckinKey, DashboardData, ScheduleBlock } from "@/lib/types";
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

export function TrackerDashboard({
  currentUser,
}: {
  currentUser: {
    id: string;
    name: string;
    email: string;
  };
}) {
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
  const [motivation, setMotivation] = useState<string | null>(null);

  const todayKey = data?.today.dateKey ?? toDateKey();

  const scheduleBlocks = useMemo<ScheduleBlock[]>(
    () => (settings ? getScheduleForDate(todayKey, settings) : []),
    [settings, todayKey],
  );

  const schedule = useMemo<ScheduleItem[]>(
    () => scheduleBlocks.map((item) => [item.timeLabel, item.label, item.description]),
    [scheduleBlocks],
  );

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

  useEffect(() => {
    if (data?.integrations.aiReady && !motivation) {
      postJson<{ quote: string }>("/api/ai/motivate", undefined, { method: "POST" })
        .then((res) => {
          if (res && res.quote) setMotivation(res.quote);
        })
        .catch(() => {
          // ignore motivation failure
        });
    }
  }, [data, motivation]);

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
      label: "Current Streak",
      value: data.metrics.currentStreak,
      icon: Flame,
      tone: "bg-[var(--gold-soft)] text-amber-500",
    },
    {
      label: "Weekly Target",
      value: `${data.metrics.targetProgress.dsa}%`,
      icon: BrainCircuit,
      tone: "bg-[var(--teal-soft)] text-teal-400",
    },
    {
      label: "Applications",
      value: data.metrics.weekApplications,
      icon: Briefcase,
      tone: "bg-[var(--rose-soft)] text-rose-400",
    },
    {
      label: "Max Streak",
      value: data.metrics.maxStreak,
      icon: Rocket,
      tone: "bg-[var(--navy-soft)] text-sky-400",
    },
    {
      label: "Level " + data.metrics.level,
      value: `${data.metrics.levelProgress}%`,
      icon: CheckCircle2,
      tone: "bg-[var(--green-soft)] text-emerald-400",
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
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--gold-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold)]">
                Career OS for ByteAcumen
              </div>
              <h1 className="heading-font max-w-3xl text-4xl leading-[0.95] sm:text-5xl lg:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-400">
                Proper tracker. Proper storage. Proper momentum.
              </h1>
              {motivation && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 italic text-[var(--teal)] font-medium text-lg leading-relaxed">
                  &quot;{motivation}&quot;
                </motion.div>
              )}
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                This app stores your study data in a real database, keeps GitHub and
                Google Sheets connected, and adds an AI coach layer from the backend
                so secrets stay safe. It is built around your weekday office reality
                and your stronger weekend study windows.
              </p>
              <div className="mt-4 inline-flex max-w-2xl text-wrap rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-2 text-sm text-[var(--ink)]">
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
              <div className="soft-card">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      Signed in as
                    </div>
                    <div className="mt-2 text-lg font-semibold text-[var(--ink)]">
                      {currentUser.name}
                    </div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      {currentUser.email}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      void authClient.signOut().then(() => {
                        window.location.href = "/sign-in";
                      });
                    }}
                    className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--line)]"
                  >
                    Sign out
                  </button>
                </div>
              </div>
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
                    ? "border-transparent bg-[var(--ink)] text-[var(--paper)]"
                    : "border-[var(--line)] bg-transparent text-[var(--muted)] hover:bg-[var(--line)] hover:text-[var(--ink)]",
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

        <div className="mt-2 relative">
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <OverviewTab
                  data={data}
                  settings={settings}
                  schedule={schedule}
                  runAction={runAction}
                />
              </motion.div>
            )}
            {activeTab === "today" && (
              <motion.div key="today" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <TodayTab
                  data={data}
                  settings={settings}
                  todayKey={todayKey}
                  scheduleBlocks={scheduleBlocks}
                  reviewForm={reviewForm}
                  setReviewForm={setReviewForm}
                  dsaForm={dsaForm}
                  setDsaForm={setDsaForm}
                  buildForm={buildForm}
                  setBuildForm={setBuildForm}
                  applicationForm={applicationForm}
                  setApplicationForm={setApplicationForm}
                  setToast={setToast}
                  runAction={runAction}
                />
              </motion.div>
            )}
            {activeTab === "history" && (
              <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <HistoryTab data={data} />
              </motion.div>
            )}
            {activeTab === "settings" && (
              <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <SettingsTab
                  settings={settings}
                  setSettings={setSettings}
                  runAction={runAction}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {toast ? (
          <div className="fixed bottom-5 right-5 rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper-strong)] shadow-xl">
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
  const [curriculum, setCurriculum] = useState<string | null>(null);

  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="grid gap-5">
        <Panel
          title="AI coach"
          subtitle="Server-side guidance based on today's real activity."
          action={
            <div className="flex items-center gap-2">
              <button
                disabled={!data.integrations.aiReady}
                onClick={(e) => {
                  e.preventDefault();
                  runAction(
                    "cluster-weakness",
                    async () => {
                      const res = await getWeaknessCurriculumAction();
                      if (res.ok && res.curriculum) setCurriculum(res.curriculum);
                    },
                    "Weaknesses clustered."
                  )
                }}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium border transition",
                  data.integrations.aiReady
                    ? "border-[var(--teal)] text-[var(--teal)] hover:bg-[var(--teal-soft)]"
                    : "cursor-not-allowed border-slate-700 text-slate-500",
                )}
              >
                Scan Weaknesses
              </button>
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
                "rounded-full px-4 py-2 text-sm font-medium text-[var(--paper-strong)]",
                data.integrations.aiReady
                  ? "bg-[var(--teal)]"
                  : "cursor-not-allowed bg-slate-400",
              )}
            >
              {data.integrations.aiReady
                ? `Run ${settings.aiProvider} coach`
                : `Connect ${settings.aiProvider} first`}
            </button>
            </div>
          }
        >
          {data.today.ai ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <InsightCard label="Summary" value={data.today.ai.summary} />
              <InsightCard label="Biggest risk" value={data.today.ai.biggestRisk} />
              <InsightCard label="Focus theme" value={data.today.ai.focusTheme} />
              <InsightCard label="Tomorrow morning" value={data.today.ai.morningPlan} />
              <InsightCard label="Night deep work" value={data.today.ai.nightPlan} />
              <InsightCard label="Application block" value={data.today.ai.applyPlan} />
              <InsightCard label="One thing to cut" value={data.today.ai.oneCut} />
              <InsightCard label="Weekend mission" value={data.today.ai.weekendMission} />
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

          <AnimatePresence>
            {curriculum && (
              <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="mt-4 p-4 rounded-xl border border-[var(--rose-soft)] bg-rose-500/5 text-rose-200 text-sm leading-relaxed overflow-hidden">
                <div className="font-semibold mb-2 flex items-center gap-2 uppercase tracking-widest text-[10px] text-rose-400">
                  <Target className="size-3.5" /> Identified Weakness Cluster
                </div>
                {curriculum}
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>

        <Panel title="14-day momentum" subtitle="Progress looks better when the data survives each day.">
          <div className="h-[240px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={data.history.slice(-14)} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis 
                  dataKey="dateKey" 
                  tickFormatter={(v) => format(parseISO(`${v}T00:00:00`), "dd MMM")} 
                  stroke="var(--muted)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="var(--muted)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: 'var(--paper-strong)', borderColor: 'var(--line)', borderRadius: '12px', fontSize: '13px', border: '1px solid rgba(255,255,255,0.1)' }}
                  itemStyle={{ color: 'var(--ink)' }}
                  labelFormatter={(v) => format(parseISO(`${v}T00:00:00`), "EEEE, dd MMM")}
                />
                <Bar dataKey="dsaCount" name="DSA" stackId="a" fill="#2dd4bf" radius={[0, 0, 4, 4]} maxBarSize={40} />
                <Bar dataKey="buildCount" name="Builds" stackId="a" fill="#0ea5e9" maxBarSize={40} />
                <Bar dataKey="appCount" name="Apps" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
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
        <Panel title="Weekly targets" subtitle="Track the numbers that actually move your job search forward.">
          <div className="space-y-3">
            <TargetProgressRow
              label="DSA problems"
              current={data.metrics.weekDsa}
              target={settings.weeklyDsaTarget}
              progress={data.metrics.targetProgress.dsa}
            />
            <TargetProgressRow
              label="Applications"
              current={data.metrics.weekApplications}
              target={settings.weeklyApplicationTarget}
              progress={data.metrics.targetProgress.applications}
            />
            <TargetProgressRow
              label="Build outputs"
              current={data.metrics.weekBuilds}
              target={settings.weeklyBuildTarget}
              progress={data.metrics.targetProgress.builds}
            />
          </div>
        </Panel>

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
                  ? "bg-[var(--paper-strong)] text-[var(--ink)] hover:opacity-90"
                  : "cursor-not-allowed bg-[var(--line)] text-[var(--muted)]",
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
  settings,
  todayKey,
  scheduleBlocks,
  reviewForm,
  setReviewForm,
  dsaForm,
  setDsaForm,
  buildForm,
  setBuildForm,
  applicationForm,
  setApplicationForm,
  setToast,
  runAction,
}: {
  data: DashboardData;
  settings: SettingsForm;
  todayKey: string;
  scheduleBlocks: ScheduleBlock[];
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
  setToast: React.Dispatch<React.SetStateAction<string>>;
  runAction: <T>(label: string, request: () => Promise<T>, successMessage: string) => Promise<void>;
}) {
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-5">
        <FocusToolsPanel
          dateKey={todayKey}
          settings={settings}
          scheduleBlocks={scheduleBlocks}
          setToast={setToast}
        />

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
                    ? "border-transparent bg-[var(--teal)] text-[var(--paper-strong)]"
                    : "border-[var(--line)] soft-card hover:bg-[var(--line)]",
                )}
              >
                <div>
                  <div className="font-medium">{label}</div>
                  <div
                    className={cn(
                      "mt-1 text-sm",
                      data.today.checkins[key] ? "text-[var(--paper-strong)]/80" : "text-[var(--muted)]",
                    )}
                  >
                    {copy}
                  </div>
                </div>
                <CheckCircle2 className="size-5" />
              </button>
            ))}

            <div className="rounded-[28px] border border-[var(--line)] soft-card p-5">
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
                  className="rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-medium text-[var(--paper-strong)]"
                >
                  Save daily review
                </button>
              </div>
            </div>
          </div>
        </Panel>
      </div>

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
              <div key="insight-container" className="relative">
                <textarea
                  value={dsaForm.insight}
                  onChange={(event) =>
                    setDsaForm((current) => ({ ...current, insight: event.target.value }))
                  }
                  className="field-area"
                  placeholder="Key insight or mistake"
                />
                {!dsaForm.insight && dsaForm.title && (
                  <button
                    type="button"
                    title="Auto-generate insight with AI"
                    onClick={(e) => {
                      e.preventDefault();
                      runAction(
                        "auto-insight",
                        async () => {
                          const res = await postJson<{insight: string}>("/api/ai/insight", { type: "dsa", title: dsaForm.title, context: dsaForm.pattern });
                          if (res.insight) {
                            setDsaForm((current) => ({ ...current, insight: res.insight }));
                          }
                        },
                        "Insight generated."
                      )
                    }}
                    className="absolute top-3 right-3 z-10 text-xs bg-[var(--teal-soft)] text-[var(--teal)] px-2.5 py-1 rounded-full flex items-center gap-1 hover:bg-[var(--teal)] hover:text-white transition shadow-sm"
                  >
                    <Sparkles className="size-3" /> Auto Insight
                  </button>
                )}
              </div>,
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
              <div key="impact-container" className="relative">
                <textarea
                  value={buildForm.impact}
                  onChange={(event) =>
                    setBuildForm((current) => ({ ...current, impact: event.target.value }))
                  }
                  className="field-area"
                  placeholder="Why does this matter?"
                />
                {!buildForm.impact && buildForm.title && (
                  <button
                    type="button"
                    title="Auto-generate impact info with AI"
                    onClick={(e) => {
                      e.preventDefault();
                      runAction(
                        "auto-impact",
                        async () => {
                          const res = await postJson<{insight: string}>("/api/ai/insight", { type: "build", title: buildForm.title, context: buildForm.area });
                          if (res.insight) {
                            setBuildForm((current) => ({ ...current, impact: res.insight }));
                          }
                        },
                        "Impact insight generated."
                      )
                    }}
                    className="absolute top-3 right-3 z-10 text-xs bg-[var(--teal-soft)] text-[var(--teal)] px-2.5 py-1 rounded-full flex items-center gap-1 hover:bg-[var(--teal)] hover:text-white transition shadow-sm"
                  >
                    <Sparkles className="size-3" /> Auto Impact
                  </button>
                )}
              </div>,
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
              <div key="note-container" className="relative">
                <textarea
                  value={applicationForm.note}
                  onChange={(event) =>
                    setApplicationForm((current) => ({ ...current, note: event.target.value }))
                  }
                  className="field-area"
                  placeholder="Referral, recruiter name, follow-up, or result"
                />
                {!applicationForm.note && applicationForm.company && applicationForm.role && (
                  <button
                    type="button"
                    title="Predict match quality with AI"
                    onClick={(e) => {
                      e.preventDefault();
                      runAction(
                        "predict-match",
                        async () => {
                          const res = await predictMatchAction(applicationForm.company, applicationForm.role);
                          if (res.ok && res.data) {
                            setApplicationForm((current) => ({ ...current, note: `Match Score: ${res.data.score}/100. ${res.data.analysis}` }));
                          }
                        },
                        "Match analysis generated."
                      )
                    }}
                    className="absolute top-3 right-3 z-10 text-xs bg-[var(--teal-soft)] text-[var(--teal)] px-2.5 py-1 rounded-full flex items-center gap-1 hover:bg-[var(--teal)] hover:text-white transition shadow-sm"
                  >
                    <Sparkles className="size-3" /> Analyze Match
                  </button>
                )}
              </div>,
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const stats = {
    totalDSA: data.history.reduce((acc, h) => acc + h.dsaCount, 0),
    totalBuilds: data.history.reduce((acc, h) => acc + h.buildCount, 0),
    totalApps: data.history.reduce((acc, h) => acc + h.appCount, 0),
  };

  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
      <Panel title="Execution graph" subtitle="A 90-day view of your output. Click a day for full logs.">
        <div className="flex flex-col gap-6">
          <CalendarHeatmap history={data.history} onSelect={setSelectedDate} />
          
          <div className="grid grid-cols-3 gap-3">
            <div className="soft-card flex flex-col items-center justify-center p-4">
              <BrainCircuit className="size-5 text-[var(--teal)] mb-2" />
              <div className="text-xl font-bold">{stats.totalDSA}</div>
              <div className="text-xs text-[var(--muted)]">90-Day DSA</div>
            </div>
            <div className="soft-card flex flex-col items-center justify-center p-4">
              <Rocket className="size-5 text-[var(--navy)] mb-2" />
              <div className="text-xl font-bold">{stats.totalBuilds}</div>
              <div className="text-xs text-[var(--muted)]">90-Day Builds</div>
            </div>
            <div className="soft-card flex flex-col items-center justify-center p-4">
              <Briefcase className="size-5 text-[var(--rose)] mb-2" />
              <div className="text-xl font-bold">{stats.totalApps}</div>
              <div className="text-xs text-[var(--muted)]">90-Day Apps</div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Recent logging" subtitle="You need momentum more than motivation.">
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {data.history
            .slice(-14)
            .reverse()
            .map((item) => (
              <div 
                key={item.dateKey} 
                className="soft-card cursor-pointer hover:border-[var(--teal-soft)] transition-colors"
                onClick={() => setSelectedDate(item.dateKey)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{format(parseISO(`${item.dateKey}T00:00:00`), "MMM d, yyyy")}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      {item.completedCount}/5 habit blocks
                    </div>
                  </div>
                  <div className="rounded-full bg-[var(--gold-soft)] px-3 py-1 text-xs font-semibold text-amber-500">
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

      <AnimatePresence>
        {selectedDate && <DailyDetailModal dateKey={selectedDate} onClose={() => setSelectedDate(null)} />}
      </AnimatePresence>
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
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink)] block">Primary Goal</label>
            <p className="text-xs text-[var(--muted)]">The overarching mission that dictates your application matching and AI coaching.</p>
            <textarea
              value={settings.primaryGoal}
              onChange={(event) =>
                setSettings((current) => (current ? { ...current, primaryGoal: event.target.value } : current))
              }
              className="field-area"
              placeholder="e.g., Actively applying for Senior Frontend roles with React/Next.js"
            />
          </div>

          <div className="mt-4 mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-[var(--teal)] border-b border-[var(--line)] pb-2">Integrations & Profiles</div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--ink)] block">Google Sheet Webhook URL</label>
              <input
                value={settings.sheetUrl}
                onChange={(event) =>
                  setSettings((current) => (current ? { ...current, sheetUrl: event.target.value } : current))
                }
                className="field"
                placeholder="Google Sheet URL"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--ink)] block">Google Apps Script URL</label>
              <input
                value={settings.googleAppsScriptUrl}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, googleAppsScriptUrl: event.target.value } : current,
                  )
                }
                className="field"
                placeholder="Apps Script Endpoint"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--ink)] block">Resume URL</label>
              <input
                value={settings.resumeUrl}
                onChange={(event) =>
                  setSettings((current) => (current ? { ...current, resumeUrl: event.target.value } : current))
                }
                className="field"
                placeholder="Resume link (Drive, PDF)"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--ink)] block">GitHub URL</label>
              <input
                value={settings.githubUrl}
                onChange={(event) =>
                  setSettings((current) => (current ? { ...current, githubUrl: event.target.value } : current))
                }
                className="field"
                placeholder="GitHub Profile"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--ink)] block">LeetCode URL</label>
              <input
                value={settings.leetcodeUrl}
                onChange={(event) =>
                  setSettings((current) => (current ? { ...current, leetcodeUrl: event.target.value } : current))
                }
                className="field"
                placeholder="LeetCode Profile"
              />
            </div>
          </div>

          <div className="mt-4 mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-[var(--teal)] border-b border-[var(--line)] pb-2">AI Configuration</div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--ink)] block">AI Provider</label>
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
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--ink)] block">AI Model String</label>
              <input
                value={settings.openAiModel}
                onChange={(event) =>
                  setSettings((current) => (current ? { ...current, openAiModel: event.target.value } : current))
                }
                className="field"
                placeholder="e.g. gpt-4o-mini"
              />
            </div>
          </div>

          <div className="mt-4 mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-[var(--teal)] border-b border-[var(--line)] pb-2">Targets & Timeboxing</div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--ink)] block">Weekly DSA Target</label>
              <input
                type="number"
                value={settings.weeklyDsaTarget}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, weeklyDsaTarget: Number(event.target.value) } : current,
                  )
                }
                className="field"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--ink)] block">Weekly Apps Target</label>
              <input
                type="number"
                value={settings.weeklyApplicationTarget}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? { ...current, weeklyApplicationTarget: Number(event.target.value) }
                      : current,
                  )
                }
                className="field"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--ink)] block">Weekly Build Target</label>
              <input
                type="number"
                value={settings.weeklyBuildTarget}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, weeklyBuildTarget: Number(event.target.value) } : current,
                  )
                }
                className="field"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--ink)] block">Weekend DSA Minutes</label>
              <input
                type="number"
                value={settings.weekendDsaMinutes}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, weekendDsaMinutes: Number(event.target.value) } : current,
                  )
                }
                className="field"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--ink)] block">Weekend Build Minutes</label>
              <input
                type="number"
                value={settings.weekendBuildMinutes}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, weekendBuildMinutes: Number(event.target.value) } : current,
                  )
                }
                className="field"
              />
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--ink)] block">Focus Timer Length (min)</label>
              <input
                type="number"
                value={settings.timerFocusMinutes}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, timerFocusMinutes: Number(event.target.value) } : current,
                  )
                }
                className="field"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--ink)] block">Break Timer Length (min)</label>
              <input
                type="number"
                value={settings.timerBreakMinutes}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, timerBreakMinutes: Number(event.target.value) } : current,
                  )
                }
                className="field"
              />
            </div>
          </div>

          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--gold-soft)] px-4 py-3 text-sm text-[var(--gold)]">
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
            className="rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-medium text-[var(--paper-strong)]"
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

function FocusToolsPanel({
  dateKey,
  settings,
  scheduleBlocks,
  setToast,
}: {
  dateKey: string;
  settings: SettingsForm;
  scheduleBlocks: ScheduleBlock[];
  setToast: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [timerMode, setTimerMode] = useState<"focus" | "break">("focus");
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(settings.timerFocusMinutes * 60);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(() =>
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );
  const reminderTimeoutsRef = useRef<number[]>([]);

  const targetSeconds =
    timerMode === "focus"
      ? settings.timerFocusMinutes * 60
      : settings.timerBreakMinutes * 60;

  const nextBlock = useMemo(
    () => scheduleBlocks.find((item) => new Date(item.startIso).getTime() > currentTime) ?? null,
    [currentTime, scheduleBlocks],
  );

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setIsRunning(false);
          setToast(
            timerMode === "focus"
              ? "Focus session complete. Take a short break."
              : "Break complete. Get back into the next block.",
          );

          if (notificationPermission === "granted" && "Notification" in window) {
            new Notification(
              timerMode === "focus"
                ? "Career OS focus block finished"
                : "Career OS break finished",
              {
                body:
                  timerMode === "focus"
                    ? "Good work. Log the output before switching tasks."
                    : "Break is over. Start the next deep-work block.",
              },
            );
          }

          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, notificationPermission, setToast, timerMode]);

  useEffect(
    () => () => {
      clearReminderTimeouts(reminderTimeoutsRef.current);
    },
    [],
  );

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setToast("Browser notifications are not supported here.");
      setNotificationPermission("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    setToast(
      permission === "granted"
        ? "Notifications enabled for this browser."
        : "Notifications were not enabled.",
    );
  }

  function armTodayReminders() {
    if (notificationPermission !== "granted") {
      setToast("Enable notifications first.");
      return;
    }

    clearReminderTimeouts(reminderTimeoutsRef.current);
    reminderTimeoutsRef.current = [];

    const upcoming = scheduleBlocks.filter((item) => new Date(item.startIso).getTime() > Date.now());

    if (!upcoming.length) {
      setToast("No future blocks remain for today.");
      return;
    }

    for (const item of upcoming) {
      const delay = new Date(item.startIso).getTime() - Date.now();
      const timeoutId = window.setTimeout(() => {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`Career OS: ${item.label}`, {
            body: item.description,
          });
        }
      }, delay);

      reminderTimeoutsRef.current.push(timeoutId);
    }

    setToast("Today's reminders are armed while this tab stays open.");
  }

  return (
    <Panel title="Focus tools" subtitle="Timer, browser reminders, and one-click calendar export.">
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
          <div className="soft-card">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setTimerMode("focus");
                  setIsRunning(false);
                  setSecondsLeft(settings.timerFocusMinutes * 60);
                }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium",
                  timerMode === "focus" ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-transparent hover:bg-[var(--line)] text-[var(--ink)]",
                )}
              >
                Focus {settings.timerFocusMinutes}m
              </button>
              <button
                onClick={() => {
                  setTimerMode("break");
                  setIsRunning(false);
                  setSecondsLeft(settings.timerBreakMinutes * 60);
                }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium",
                  timerMode === "break" ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-transparent hover:bg-[var(--line)] text-[var(--ink)]",
                )}
              >
                Break {settings.timerBreakMinutes}m
              </button>
            </div>
            <div className="mt-4 text-5xl font-semibold tracking-tight">{formatTimer(secondsLeft)}</div>
            <div className="mt-2 text-sm text-[var(--muted)]">
              {timerMode === "focus"
                ? "Use this for DSA, coding, or application batches."
                : "Use the break timer so your second session still has energy."}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  if (secondsLeft === 0) {
                    setSecondsLeft(targetSeconds);
                  }
                  setIsRunning((current) => !current);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--paper)] hover:opacity-90"
              >
                {isRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
                {isRunning ? "Pause timer" : "Start timer"}
              </button>
              <button
                onClick={() => {
                  setIsRunning(false);
                  setSecondsLeft(targetSeconds);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-transparent hover:bg-[var(--line)] px-4 py-2 text-sm font-medium"
              >
                <RotateCcw className="size-4" />
                Reset
              </button>
            </div>
          </div>

          <div className="soft-card text-sm text-[var(--muted)]">
            <div className="font-medium text-[var(--ink)]">Next block</div>
            <div className="mt-3">
              {nextBlock ? (
                <>
                  <div className="text-lg font-semibold text-[var(--ink)]">{nextBlock.label}</div>
                  <div className="mt-1">{nextBlock.timeLabel}</div>
                  <div className="mt-2 leading-6">{nextBlock.description}</div>
                </>
              ) : (
                "No scheduled block remains for today."
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <button
            onClick={() => void enableNotifications()}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[var(--ink)] text-[var(--paper)] px-4 py-3 text-sm font-medium hover:opacity-90"
          >
            <Bell className="size-4" />
            {notificationPermission === "granted" ? "Notifications on" : "Enable notifications"}
          </button>
          <button
            onClick={armTodayReminders}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[var(--ink)] text-[var(--paper)] px-4 py-3 text-sm font-medium hover:opacity-90"
          >
            <Clock3 className="size-4" />
            Arm today&apos;s reminders
          </button>
          <a
            href={`/api/calendar/today?date=${dateKey}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[var(--ink)] text-[var(--paper)] px-4 py-3 text-sm font-medium hover:opacity-90"
          >
            <CalendarRange className="size-4" />
            Download calendar
          </a>
        </div>

        <div className="rounded-[20px] border border-[var(--line)] soft-card px-4 py-3 text-sm text-[var(--muted)]">
          Browser reminders work only while this tab stays open. Use the calendar export for reliable phone
          or laptop reminders outside the browser.
        </div>
      </div>
    </Panel>
  );
}

function TargetProgressRow({
  label,
  current,
  target,
  progress,
}: {
  label: string;
  current: number;
  target: number;
  progress: number;
}) {
  return (
    <div className="soft-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-[var(--ink)]">{label}</div>
          <div className="mt-1 text-sm text-[var(--muted)]">
            {current}/{target} this week
          </div>
        </div>
        <div className="rounded-full bg-[var(--gold-soft)] px-3 py-1 text-xs font-semibold text-amber-900">
          {progress}%
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white">
        <div className="h-2 rounded-full bg-[var(--teal)]" style={{ width: `${progress}%` }} />
      </div>
    </div>
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
      className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--paper-strong)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--line)]"
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
    <div className="soft-card">
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
    <div className="rounded-[20px] border border-dashed border-[var(--line)] bg-transparent px-4 py-5 text-sm text-[var(--muted)]">
      {text}
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-[var(--line)] bg-[var(--card)] px-4 py-3">
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
    <div className="soft-card p-4">
      <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {title}
      </div>
      <div className="space-y-3">
        {items.length ? (
          items.map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              className="rounded-[18px] border border-[var(--line)] bg-black/20 p-3"
            >
              <div className="font-medium text-[var(--ink)]">{item.title}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">{item.subtitle}</div>
              <div className="mt-2 text-sm leading-6 text-[var(--ink)]">{item.meta}</div>
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--teal)] transition hover:text-white"
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
        className="rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-medium text-[var(--paper-strong)]"
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

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function clearReminderTimeouts(timeouts: number[]) {
  for (const timeout of timeouts) {
    window.clearTimeout(timeout);
  }
  timeouts.length = 0;
}

function CalendarHeatmap({ history, onSelect }: { history: DashboardData["history"]; onSelect: (date: string) => void }) {
  const days = useMemo(() => {
    const list = [];
    const today = new Date();
    const map = new Map(history.map(h => [h.dateKey, h]));

    for (let i = 89; i >= 0; i--) {
      const d = subDays(today, i);
      const key = format(d, "yyyy-MM-dd");
      const data = map.get(key);
      let intensity = 0;
      
      if (data) {
        const totalRaw = data.completedCount + data.dsaCount + data.buildCount + data.appCount;
        if (totalRaw > 0) intensity = 1;
        if (totalRaw >= 3) intensity = 2;
        if (totalRaw >= 6) intensity = 3;
        if (totalRaw >= 10) intensity = 4;
      }
      
      list.push({ dateKey: key, intensity, raw: data });
    }
    return list;
  }, [history]);

  return (
    <div className="w-full flex justify-center">
      <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ width: "max-content" }}>
        {days.map((day) => {
          let bg = "bg-white/5";
          if (day.intensity === 1) bg = "bg-[var(--teal-soft)]";
          if (day.intensity === 2) bg = "bg-teal-500/40";
          if (day.intensity === 3) bg = "bg-teal-400/70";
          if (day.intensity === 4) bg = "bg-[var(--teal)]";
          
          return (
            <div 
              key={day.dateKey} 
              onClick={() => onSelect(day.dateKey)}
              className={cn("w-3.5 h-3.5 rounded-sm cursor-pointer transition-transform hover:scale-125 hover:z-10", bg)}
              title={`${day.dateKey}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function DailyDetailModal({ dateKey, onClose }: { dateKey: string; onClose: () => void }) {
  const [detail, setDetail] = useState<{
    dateKey: string;
    checkins: Record<string, boolean>;
    note: string;
    tomorrowTask: string;
    aiSummary: string | null;
    dsa: Array<{id: string, title: string, difficulty: string, pattern: string, insight: string | null, repositoryUrl: string | null}>;
    builds: Array<{id: string, title: string, area: string, proof: string | null, impact: string | null, repositoryUrl: string | null}>;
    applications: Array<{id: string, company: string, role: string, status: string, note: string | null, roleUrl: string | null}>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/dashboard/history?date=${dateKey}`)
      .then(r => r.json())
      .then(d => {
        setDetail(d);
        setLoading(false);
      });
  }, [dateKey]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-card rounded-[32px] p-6 lg:p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold heading-font">
            {format(parseISO(`${dateKey}T00:00:00`), "EEEE, MMMM do yyyy")}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="size-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[var(--muted)]">Loading timeline...</div>
        ) : !detail ? (
          <div className="py-20 text-center text-[var(--muted)]">No logs found for this date.</div>
        ) : (
          <div className="space-y-6">
            {detail.aiSummary && (
              <div className="p-4 rounded-[20px] bg-gradient-to-r from-[var(--teal-soft)] to-transparent border border-[var(--line)]">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--teal)] mb-2">Automated Coach Summary</div>
                <div className="text-sm leading-relaxed">{detail.aiSummary}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="soft-card">
                <div className="font-semibold text-sm text-[var(--muted)] mb-3 uppercase tracking-widest">Blocks</div>
                <ul className="space-y-2 text-sm">
                  {Object.entries(detail.checkins).map(([key, value]) => value ? (
                    <li key={key} className="flex items-center gap-2">
                       <CheckCircle2 className="size-4 text-[var(--teal)]" />
                       {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </li>
                  ) : null)}
                  {Object.values(detail.checkins).every(v => !v) && <li className="text-[var(--muted)]">No blocks completed.</li>}
                </ul>
              </div>
              <div className="soft-card">
                <div className="font-semibold text-sm text-[var(--muted)] mb-3 uppercase tracking-widest">Notes</div>
                <div className="text-sm leading-relaxed mb-3">
                  <span className="font-medium">End of day note:</span> {detail.note || "No note."}
                </div>
                <div className="text-sm leading-relaxed">
                  <span className="font-medium">Next task:</span> {detail.tomorrowTask || "Not planned."}
                </div>
              </div>
            </div>

            <DailyDetailList title="DSA Problems" items={detail.dsa} icon={BrainCircuit} renderItem={(i: {title: string, difficulty: string, pattern: string, insight: string | null, repositoryUrl: string | null}) => (
               <><div className="font-medium text-[var(--teal)]">{i.title} <span className="text-xs text-[var(--muted)] border border-[var(--line)] rounded px-1.5 py-0.5 ml-2">{i.difficulty}</span> <span className="text-xs text-[var(--muted)] border border-[var(--line)] rounded px-1.5 py-0.5 ml-1">{i.pattern}</span></div><div className="text-sm mt-1">{i.insight || "No insight."}</div>{i.repositoryUrl && <a href={i.repositoryUrl} target="_blank" rel="noreferrer" className="text-xs border border-[var(--line)] rounded-full px-2 py-1 mt-2 inline-flex items-center gap-1 hover:bg-white/10"><Target className="size-3" /> Proof</a>}</>
            )} />

            <DailyDetailList title="Build Logging" items={detail.builds} icon={Rocket} renderItem={(i: {title: string, area: string, proof: string | null, impact: string | null, repositoryUrl: string | null}) => (
               <><div className="font-medium text-sky-400">{i.title} <span className="text-xs text-[var(--muted)] border border-[var(--line)] rounded px-1.5 py-0.5 ml-2">{i.area}</span></div><div className="text-sm mt-1">{i.proof || "No proof text."}</div><div className="text-sm mt-1 text-[var(--muted)]">{i.impact}</div>{i.repositoryUrl && <a href={i.repositoryUrl} target="_blank" rel="noreferrer" className="text-xs border border-[var(--line)] rounded-full px-2 py-1 mt-2 inline-flex items-center gap-1 hover:bg-white/10"><Target className="size-3" /> Commit / Deploy</a>}</>
            )} />

            <DailyDetailList title="Applications" items={detail.applications} icon={Briefcase} renderItem={(i: {role: string, company: string, status: string, note: string | null, roleUrl: string | null}) => (
               <><div className="font-medium text-rose-400">{i.role} at {i.company} <span className="text-xs text-[var(--muted)] border border-[var(--line)] rounded px-1.5 py-0.5 ml-2">{i.status}</span></div><div className="text-sm mt-1">{i.note || "No note."}</div>{i.roleUrl && <a href={i.roleUrl} target="_blank" rel="noreferrer" className="text-xs border border-[var(--line)] rounded-full px-2 py-1 mt-2 inline-flex items-center gap-1 hover:bg-white/10"><Briefcase className="size-3" /> Job Post</a>}</>
            )} />

          </div>
        )}
      </motion.div>
    </div>
  );
}

function DailyDetailList<T>({ title, items, icon: Icon, renderItem }: { title: string, items: T[], icon: React.ElementType, renderItem: (item: T) => React.ReactNode }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-widest text-[var(--muted)] mb-3">
        <Icon className="size-4" /> {title} ({items.length})
      </div>
      <div className="space-y-3">
        {items.map((item: T, idx) => (
          <div key={idx} className="p-4 rounded-2xl border border-[var(--line)] bg-white/5">
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  )
}
