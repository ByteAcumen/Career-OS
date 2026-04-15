"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BrainCircuit,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import type {
  DashboardData,
  PlannerSuggestion,
  PlannerSuggestionPack,
  PlannerTaskCategory,
  PlannerTaskPriority,
  PlannerTaskScope,
  PlannerTaskStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type TaskFormState = {
  title: string;
  details: string;
  scope: PlannerTaskScope;
  category: PlannerTaskCategory;
  priority: PlannerTaskPriority;
  estimateMinutes: number;
  targetDateKey: string;
};

const scopeOrder: PlannerTaskScope[] = ["daily", "weekly", "weekend"];

const scopeMeta: Record<
  PlannerTaskScope,
  { label: string; subtitle: string; tone: string; empty: string }
> = {
  daily: {
    label: "Daily lane",
    subtitle: "Short, finishable tasks that steer today.",
    tone: "bg-white text-black",
    empty: "No daily tasks yet. Add one clear task for today.",
  },
  weekly: {
    label: "Weekly lane",
    subtitle: "Work that needs steady follow-through.",
    tone: "bg-white/8 text-white",
    empty: "No weekly tasks yet. Add one medium-sized commitment.",
  },
  weekend: {
    label: "Weekend lane",
    subtitle: "Heavier work for longer sessions.",
    tone: "bg-white/8 text-white",
    empty: "No weekend tasks yet. Save the heavier work here.",
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function TaskBoard({
  tasks,
  summary,
  todayKey,
  form,
  setForm,
  onCreateTask,
  onAdvanceTask,
  onDeleteTask,
  aiReady,
  suggestions,
  suggestionsLoading,
  onGenerateSuggestions,
  onImportSuggestion,
}: {
  tasks: DashboardData["planner"]["tasks"];
  summary: DashboardData["planner"]["summary"];
  todayKey: string;
  form: TaskFormState;
  setForm: React.Dispatch<React.SetStateAction<TaskFormState>>;
  onCreateTask: () => void;
  onAdvanceTask: (
    task: DashboardData["planner"]["tasks"][number],
    nextStatus: PlannerTaskStatus,
  ) => void;
  onDeleteTask: (id: string) => void;
  aiReady: boolean;
  suggestions: PlannerSuggestionPack | null;
  suggestionsLoading: boolean;
  onGenerateSuggestions: () => void;
  onImportSuggestion: (suggestion: PlannerSuggestion) => void;
}) {
  const groupedTasks = scopeOrder.map((scope) => ({
    scope,
    tasks: tasks.filter((task) => task.scope === scope),
  }));

  const summaryCards = [
    {
      label: "Open now",
      value: summary.todayOpen,
      detail: "Tasks still competing for today.",
    },
    {
      label: "Completed",
      value: summary.completed,
      detail: "Tasks already finished.",
    },
    {
      label: "Daily pace",
      value: `${summary.daily.completed}/${summary.daily.total}`,
      detail: "Closed daily tasks.",
    },
    {
      label: "Weekend pace",
      value: `${summary.weekend.completed}/${summary.weekend.total}`,
      detail: "Progress on heavier work.",
    },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid gap-6">
        <motion.section
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="glass-card section-panel rounded-[30px] p-5 sm:p-6"
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  <ClipboardList className="size-3.5" />
                  Plan builder
                </div>
                <h2 className="mt-4 text-xl font-semibold tracking-tight text-white sm:text-[1.45rem]">
                  Add the next task without overloading the page
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  Keep task creation calm and specific. Capture the title, scope, and finish
                  condition, then move into the task lane instead of collecting vague todos.
                </p>
              </div>

              <div className="rounded-full border border-[var(--line)] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
                Today {todayKey}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              {summaryCards.map((card) => (
                <div key={card.label} className="soft-card min-h-[136px]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    {card.label}
                  </div>
                  <div className="mt-4 text-[1.9rem] font-semibold tracking-[-0.05em] text-white">
                    {card.value}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {card.detail}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[26px] border border-[var(--line)] bg-white/[0.02] p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white">New planner task</div>
                  <div className="mt-1 text-sm leading-7 text-[var(--muted)]">
                    Name the task clearly, then decide where it belongs.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCreateTask}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-neutral-200"
                >
                  <Plus className="size-4" />
                  Save task
                </button>
              </div>

              <div className="grid gap-3">
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  className="field"
                  placeholder="Task title"
                />

                <textarea
                  value={form.details}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, details: event.target.value }))
                  }
                  className="field-area min-h-[110px]"
                  placeholder="Optional detail, exit criteria, or the exact deliverable."
                />

                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                  <select
                    value={form.scope}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        scope: event.target.value as PlannerTaskScope,
                      }))
                    }
                    className="field"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="weekend">Weekend</option>
                  </select>

                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        category: event.target.value as PlannerTaskCategory,
                      }))
                    }
                    className="field"
                  >
                    <option value="revision">Revision</option>
                    <option value="dsa">DSA</option>
                    <option value="build">Build</option>
                    <option value="application">Application</option>
                    <option value="interview">Interview</option>
                    <option value="custom">Custom</option>
                  </select>

                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        priority: event.target.value as PlannerTaskPriority,
                      }))
                    }
                    className="field"
                  >
                    <option value="high">High priority</option>
                    <option value="medium">Medium priority</option>
                    <option value="low">Low priority</option>
                  </select>

                  <input
                    type="number"
                    value={form.estimateMinutes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        estimateMinutes: Number(event.target.value),
                      }))
                    }
                    className="field"
                    min={15}
                    max={480}
                    placeholder="Minutes"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-[0.95fr_1.05fr]">
                  <input
                    type="date"
                    value={form.targetDateKey}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, targetDateKey: event.target.value }))
                    }
                    className="field"
                    disabled={form.scope !== "daily"}
                  />

                  <div className="rounded-[18px] border border-[var(--line)] bg-white/[0.03] px-4 py-3 text-sm leading-7 text-[var(--muted)]">
                    Daily tasks can target a specific day. Weekly and weekend tasks stay visible
                    until you finish them.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="glass-card section-panel rounded-[30px] p-5 sm:p-6"
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  <BrainCircuit className="size-3.5" />
                  AI task pack
                </div>
                <h2 className="mt-4 text-xl font-semibold tracking-tight text-white">
                  Generate a cleaner weekly queue
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  Ask AI for a compact pack when you want structure, then import only the tasks
                  that feel worth doing.
                </p>
              </div>

              <button
                type="button"
                disabled={!aiReady || suggestionsLoading}
                onClick={onGenerateSuggestions}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition",
                  aiReady && !suggestionsLoading
                    ? "bg-white text-black hover:bg-neutral-200"
                    : "cursor-not-allowed border border-[var(--line)] bg-white/[0.04] text-[var(--muted)]",
                )}
              >
                <Sparkles className={cn("size-4", suggestionsLoading && "animate-spin")} />
                {suggestionsLoading ? "Generating..." : "Generate pack"}
              </button>
            </div>

            {suggestions ? (
              <div className="grid gap-4">
                <div className="rounded-[20px] border border-[var(--line)] bg-white/[0.03] px-4 py-4 text-sm leading-7 text-[var(--muted)]">
                  {suggestions.headline}
                </div>

                <div className="grid gap-4">
                  {scopeOrder.map((scope) => (
                    <div key={scope} className="rounded-[24px] border border-[var(--line)] bg-white/[0.02] p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <div
                            className={cn(
                              "inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                              scopeMeta[scope].tone,
                            )}
                          >
                            {scopeMeta[scope].label}
                          </div>
                          <div className="mt-2 text-sm text-[var(--muted)]">
                            {scopeMeta[scope].subtitle}
                          </div>
                        </div>
                        <div className="rounded-full border border-[var(--line)] bg-white/[0.04] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                          {suggestions[scope].length}
                        </div>
                      </div>

                      <div className="grid gap-3">
                        {suggestions[scope].map((suggestion, index) => (
                          <div
                            key={`${scope}-${index}-${suggestion.title}`}
                            className="rounded-[20px] border border-[var(--line)] bg-white/[0.03] p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium leading-6 text-white">
                                  {suggestion.title}
                                </div>
                                <div className="mt-2 text-sm leading-7 text-[var(--muted)]">
                                  {suggestion.details}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => onImportSuggestion(suggestion)}
                                className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200"
                              >
                                Add
                              </button>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                              <span className="rounded-full border border-[var(--line)] bg-white/[0.04] px-2.5 py-1">
                                {suggestion.category}
                              </span>
                              <span className="rounded-full border border-[var(--line)] bg-white/[0.04] px-2.5 py-1">
                                {suggestion.priority}
                              </span>
                              <span className="rounded-full border border-[var(--line)] bg-white/[0.04] px-2.5 py-1">
                                {suggestion.estimateMinutes} min
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-white/[0.02] px-5 py-6 text-sm leading-7 text-[var(--muted)]">
                Generate a planner pack when you want AI to suggest a practical daily, weekly,
                and weekend queue based on your stored goals and recent momentum.
              </div>
            )}
          </div>
        </motion.section>
      </div>

      <motion.section
        variants={itemVariants}
        initial="hidden"
        animate="show"
        className="glass-card section-panel rounded-[30px] p-5 sm:p-6"
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              <CheckCircle2 className="size-3.5" />
              Task lanes
            </div>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-white">
              Keep tasks separated by the kind of work they represent
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Daily, weekly, and weekend lanes should feel distinct so you can scan quickly
              without mixing everything into one stack.
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {groupedTasks.map(({ scope, tasks: scopedTasks }) => (
            <div
              key={scope}
              className="rounded-[26px] border border-[var(--line)] bg-white/[0.02] p-4 sm:p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div
                    className={cn(
                      "inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                      scopeMeta[scope].tone,
                    )}
                  >
                    {scopeMeta[scope].label}
                  </div>
                  <div className="mt-2 text-sm text-[var(--muted)]">
                    {scopeMeta[scope].subtitle}
                  </div>
                </div>
                <div className="rounded-full border border-[var(--line)] bg-white/[0.04] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                  {scopedTasks.length}
                </div>
              </div>

              <div className="grid gap-3">
                <AnimatePresence initial={false}>
                  {scopedTasks.length ? (
                    <motion.div
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                      variants={{
                        hidden: { opacity: 0 },
                        show: { opacity: 1, transition: { staggerChildren: 0.05 } },
                      }}
                      className="grid gap-3"
                    >
                      {scopedTasks.map((task) => (
                        <motion.div
                          key={task.id}
                          variants={itemVariants}
                          exit={{ opacity: 0, y: 10, transition: { duration: 0.18 } }}
                          className={cn(
                            "rounded-[22px] border p-4 transition",
                            task.status === "done"
                              ? "border-white/[0.12] bg-white/[0.08]"
                              : "border-[var(--line)] bg-white/[0.03] hover:border-[var(--line-strong)] hover:bg-white/[0.04]",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium leading-6 text-white">
                                {task.title}
                              </div>
                              {task.details ? (
                                <div className="mt-2 text-sm leading-7 text-[var(--muted)]">
                                  {task.details}
                                </div>
                              ) : null}
                            </div>

                            <button
                              type="button"
                              onClick={() => onDeleteTask(task.id)}
                              className="rounded-full border border-[var(--line)] bg-white/[0.04] p-2 text-[var(--muted)] hover:bg-white/[0.08] hover:text-white"
                              aria-label={`Delete ${task.title}`}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                            <span className="rounded-full border border-[var(--line)] bg-white/[0.04] px-2.5 py-1">
                              {task.category}
                            </span>
                            <span className="rounded-full border border-[var(--line)] bg-white/[0.04] px-2.5 py-1">
                              {task.priority}
                            </span>
                            <span className="rounded-full border border-[var(--line)] bg-white/[0.04] px-2.5 py-1">
                              {task.estimateMinutes} min
                            </span>
                            {task.targetDateKey ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-white/[0.04] px-2.5 py-1">
                                <CalendarRange className="size-3.5" />
                                {task.targetDateKey}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
                            <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
                              <Clock3 className="size-4" />
                              <span className="capitalize">{task.status.replace("_", " ")}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => onAdvanceTask(task, nextTaskStatus(task.status))}
                              className={cn(
                                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                                task.status === "done"
                                  ? "border border-[var(--line)] bg-white/[0.04] text-white hover:bg-white/[0.08]"
                                  : "bg-white text-black hover:bg-neutral-200",
                              )}
                            >
                              <CheckCircle2 className="size-4" />
                              {task.status === "todo"
                                ? "Start task"
                                : task.status === "in_progress"
                                  ? "Mark complete"
                                  : "Reopen"}
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="rounded-[22px] border border-dashed border-[var(--line)] bg-white/[0.02] px-4 py-8 text-center text-sm leading-7 text-[var(--muted)]"
                    >
                      {scopeMeta[scope].empty}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}

function nextTaskStatus(status: PlannerTaskStatus): PlannerTaskStatus {
  if (status === "todo") return "in_progress";
  if (status === "in_progress") return "done";
  return "todo";
}
