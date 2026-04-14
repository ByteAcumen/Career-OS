"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { CalendarClock, CheckCircle2, LoaderCircle } from "lucide-react";

import { FloatingTimer } from "@/components/floating-timer";
import { TaskBoard } from "@/components/task-board";
import { useWorkspaceUi } from "@/components/workspace/workspace-shell";
import { riseIn, sectionStagger, PageHeader, SectionCard, StatCard } from "@/components/workspace/workspace-primitives";
import { postJson } from "@/lib/client-request";
import type { PlannerPageData } from "@/lib/workspace-data";
import type {
  CheckinKey,
  DashboardData,
  PlannerSuggestion,
  PlannerSuggestionPack,
  PlannerTaskPriority,
  PlannerTaskScope,
  PlannerTaskStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type TaskFormState = {
  title: string;
  details: string;
  scope: PlannerTaskScope;
  category: DashboardData["planner"]["tasks"][number]["category"];
  priority: PlannerTaskPriority;
  estimateMinutes: number;
  targetDateKey: string;
};

const checkinCards: Array<[CheckinKey, string, string]> = [
  ["morningRevision", "Morning revision", "Short recall block before the day opens up."],
  ["microRevision", "Micro revision", "A short maintenance block during the day."],
  ["deepWork", "Deep work", "The main block for DSA or product execution."],
  ["supportBlock", "Support block", "Applications, reinforcement, or admin work."],
  ["shutdownReview", "Shutdown review", "Close the day and set the next handoff."],
];

function summarizeTasks(
  tasks: DashboardData["planner"]["tasks"],
  todayKey: string,
): DashboardData["planner"]["summary"] {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === "done").length;
  const active = tasks.filter((task) => task.status !== "done").length;
  const todayOpen = tasks.filter(
    (task) =>
      task.status !== "done" &&
      (task.scope !== "daily" || task.targetDateKey === todayKey || !task.targetDateKey),
  ).length;

  const createScopeSummary = (scope: PlannerTaskScope) => {
    const scoped = tasks.filter((task) => task.scope === scope);
    return {
      total: scoped.length,
      completed: scoped.filter((task) => task.status === "done").length,
    };
  };

  return {
    total,
    completed,
    active,
    todayOpen,
    daily: createScopeSummary("daily"),
    weekly: createScopeSummary("weekly"),
    weekend: createScopeSummary("weekend"),
  };
}

export function WorkspacePlannerPage({
  data: initialData,
}: {
  data: PlannerPageData;
}) {
  const { setToast } = useWorkspaceUi();
  const [data, setData] = useState(initialData);
  const [reviewForm, setReviewForm] = useState({
    note: initialData.today.note,
    tomorrowTask: initialData.today.tomorrowTask,
  });
  const [taskForm, setTaskForm] = useState<TaskFormState>({
    title: "",
    details: "",
    scope: "daily",
    category: "revision",
    priority: "high",
    estimateMinutes: 45,
    targetDateKey: initialData.today.dateKey,
  });
  const [plannerSuggestions, setPlannerSuggestions] = useState<PlannerSuggestionPack | null>(null);
  const [plannerSuggestionsLoading, setPlannerSuggestionsLoading] = useState(false);
  const [pendingAction, startTransition] = useTransition();

  const taskCountLabel = `${data.planner.summary.completed}/${Math.max(data.planner.summary.total, 1)} complete`;
  const openTasks = useMemo(
    () => data.planner.tasks.filter((task) => task.status !== "done"),
    [data.planner.tasks],
  );

  async function saveCheckin(key: CheckinKey, value: boolean) {
    try {
      await postJson("/api/checkins", {
        dateKey: data.today.dateKey,
        key,
        value,
      });

      setData((current) => ({
        ...current,
        today: {
          ...current.today,
          checkins: {
            ...current.today.checkins,
            [key]: value,
          },
        },
      }));
      setToast("Check-in updated.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not update the check-in.");
    }
  }

  async function saveReview() {
    try {
      await postJson("/api/checkins", {
        dateKey: data.today.dateKey,
        note: reviewForm.note,
        tomorrowTask: reviewForm.tomorrowTask,
      });

      setData((current) => ({
        ...current,
        today: {
          ...current.today,
          note: reviewForm.note,
          tomorrowTask: reviewForm.tomorrowTask,
        },
      }));
      setToast("Daily review saved.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not save the daily review.");
    }
  }

  async function createTask() {
    if (!taskForm.title.trim()) {
      setToast("Add a task title first.");
      return;
    }

    try {
      const created = await postJson<DashboardData["planner"]["tasks"][number]>("/api/tasks", {
        ...taskForm,
        targetDateKey: taskForm.scope === "daily" ? taskForm.targetDateKey : null,
      });

      setData((current) => {
        const tasks = [created, ...current.planner.tasks];
        return {
          ...current,
          planner: {
            tasks,
            summary: summarizeTasks(tasks, current.today.dateKey),
          },
        };
      });
      setTaskForm((current) => ({
        ...current,
        title: "",
        details: "",
        estimateMinutes: current.scope === "weekend" ? 90 : current.scope === "weekly" ? 60 : 45,
      }));
      setToast("Planner task saved.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not save the task.");
    }
  }

  async function advanceTask(task: DashboardData["planner"]["tasks"][number], status: PlannerTaskStatus) {
    try {
      const updated = await postJson<DashboardData["planner"]["tasks"][number]>(
        "/api/tasks",
        { id: task.id, status },
        { method: "PATCH" },
      );

      setData((current) => {
        const tasks = current.planner.tasks.map((item) => (item.id === updated.id ? updated : item));
        return {
          ...current,
          planner: {
            tasks,
            summary: summarizeTasks(tasks, current.today.dateKey),
          },
        };
      });
      setToast("Task updated.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not update the task.");
    }
  }

  async function removeTask(id: string) {
    try {
      await postJson("/api/tasks", { id }, { method: "DELETE" });

      setData((current) => {
        const tasks = current.planner.tasks.filter((item) => item.id !== id);
        return {
          ...current,
          planner: {
            tasks,
            summary: summarizeTasks(tasks, current.today.dateKey),
          },
        };
      });
      setToast("Task removed.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not remove the task.");
    }
  }

  async function generatePlannerSuggestions() {
    setPlannerSuggestionsLoading(true);

    try {
      const response = await postJson<{ suggestions: PlannerSuggestionPack }>("/api/ai/planner", undefined, {
        method: "POST",
      });
      setPlannerSuggestions(response.suggestions);
      setToast("AI planner pack generated.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not generate planner suggestions.");
    } finally {
      setPlannerSuggestionsLoading(false);
    }
  }

  async function importSuggestion(suggestion: PlannerSuggestion) {
    try {
      const created = await postJson<DashboardData["planner"]["tasks"][number]>("/api/tasks", {
        ...suggestion,
        targetDateKey: suggestion.scope === "daily" ? data.today.dateKey : null,
      });

      setData((current) => {
        const tasks = [created, ...current.planner.tasks];
        return {
          ...current,
          planner: {
            tasks,
            summary: summarizeTasks(tasks, current.today.dateKey),
          },
        };
      });
      setToast("Suggestion added to the planner.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not import the AI suggestion.");
    }
  }

  return (
    <motion.div variants={sectionStagger} initial="hidden" animate="show" className="grid gap-6">
      <motion.div variants={riseIn}>
        <PageHeader
          eyebrow="Planner"
          title="Plan the work clearly before you execute it."
          description="Planner owns task lanes, schedule rhythm, review, and focus support. Keep this page about deciding and sequencing the work, not logging everything at once."
        />
      </motion.div>

      <motion.div variants={riseIn} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active tasks" value={data.planner.summary.active} detail="Open tasks across all planner lanes." />
        <StatCard label="Today open" value={data.planner.summary.todayOpen} detail="Tasks that still compete for attention today." />
        <StatCard label="Target rhythm" value={`${data.settings.weekdayTaskTarget}/${data.settings.weekendTaskTarget}`} detail="Weekday and weekend task targets." />
        <StatCard label="Review handoff" value={reviewForm.tomorrowTask ? "Ready" : "Missing"} detail={reviewForm.tomorrowTask ? "Tomorrow task is already written." : "Write tomorrow's first task before you stop."} />
      </motion.div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.18fr)_0.82fr]">
        <TaskBoard
          tasks={data.planner.tasks}
          summary={data.planner.summary}
          todayKey={data.today.dateKey}
          form={taskForm}
          setForm={setTaskForm}
          onCreateTask={() => startTransition(() => void createTask())}
          onAdvanceTask={(task, status) => startTransition(() => void advanceTask(task, status))}
          onDeleteTask={(id) => startTransition(() => void removeTask(id))}
          aiReady={data.integrations.aiReady}
          suggestions={plannerSuggestions}
          suggestionsLoading={plannerSuggestionsLoading}
          onGenerateSuggestions={() => void generatePlannerSuggestions()}
          onImportSuggestion={(suggestion) => void importSuggestion(suggestion)}
        />

        <div className="grid gap-6">
          <SectionCard
            eyebrow="Rhythm"
            title="Today rhythm"
            description="Use schedule blocks and the timer as lightweight execution support, not as another dashboard."
          >
            <div className="grid gap-3">
              {data.scheduleBlocks.map((block) => (
                <div key={block.key} className="soft-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                        <CalendarClock className="size-3.5" />
                        {block.timeLabel}
                      </div>
                      <div className="mt-3 text-base font-medium text-white">{block.label}</div>
                      <div className="mt-2 text-sm leading-7 text-[var(--muted)]">{block.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Review"
            title="Daily review"
            description="Close the day with clear check-ins and a clean handoff for tomorrow."
            action={
              <button
                type="button"
                onClick={() => startTransition(() => void saveReview())}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-neutral-200"
              >
                {pendingAction ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Save review
              </button>
            }
          >
            <div className="grid gap-3">
              {checkinCards.map(([key, label, description]) => {
                const checked = data.today.checkins[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void saveCheckin(key, !checked)}
                    className={cn(
                      "flex items-start gap-3 rounded-[22px] border px-4 py-4 text-left transition",
                      checked
                        ? "border-white/15 bg-white/8 text-white"
                        : "border-[var(--line)] bg-white/[0.03] text-[var(--muted)] hover:bg-white/[0.05] hover:text-white",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                        checked ? "border-white bg-white text-black" : "border-[var(--line)] bg-transparent",
                      )}
                    >
                      {checked ? <CheckCircle2 className="size-3.5" /> : null}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{label}</div>
                      <div className="mt-1 text-sm leading-7 text-[var(--muted)]">{description}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  End-of-day note
                </span>
                <textarea
                  value={reviewForm.note}
                  onChange={(event) =>
                    setReviewForm((current) => ({ ...current, note: event.target.value }))
                  }
                  className="field-area min-h-[112px]"
                  placeholder="What moved forward, what dragged, and what needs to change tomorrow?"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Tomorrow task
                </span>
                <input
                  value={reviewForm.tomorrowTask}
                  onChange={(event) =>
                    setReviewForm((current) => ({ ...current, tomorrowTask: event.target.value }))
                  }
                  className="field"
                  placeholder="Write the first thing you should open tomorrow."
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Utility"
            title="Focus timer"
            description="The timer is available here as a utility so it supports planning without taking over the workspace."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="soft-card">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Timer rhythm
                </div>
                <div className="mt-3 text-sm leading-7 text-white">
                  {data.settings.timerFocusMinutes} minutes focus / {data.settings.timerBreakMinutes} minutes break
                </div>
              </div>
              <div className="soft-card">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Planner coverage
                </div>
                <div className="mt-3 text-sm leading-7 text-white">{taskCountLabel}</div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {openTasks.length ? (
        <FloatingTimer settings={data.settings} setToast={setToast} />
      ) : null}
    </motion.div>
  );
}
