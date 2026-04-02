"use client";

import { motion, AnimatePresence } from "framer-motion";
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
  { label: string; subtitle: string; tone: string }
> = {
  daily: {
    label: "Daily Tasks",
    subtitle: "Small, repeatable work that keeps momentum alive.",
    tone: "bg-[var(--teal-soft)] text-[var(--teal)]",
  },
  weekly: {
    label: "Weekly Tasks",
    subtitle: "Bigger work items that need consistent follow-through.",
    tone: "bg-[var(--navy-soft)] text-sky-300",
  },
  weekend: {
    label: "Weekend Tasks",
    subtitle: "Heavier tasks for longer, less interrupted sessions.",
    tone: "bg-[var(--gold-soft)] text-amber-300",
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

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] border border-[var(--line)] bg-white/4 p-4">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            <ClipboardList className="size-3.5" />
            Planner Summary
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PlannerStat label="Open now" value={summary.todayOpen} />
            <PlannerStat label="Completed" value={summary.completed} />
            <PlannerStat label="Daily done" value={`${summary.daily.completed}/${summary.daily.total}`} />
            <PlannerStat label="Weekend done" value={`${summary.weekend.completed}/${summary.weekend.total}`} />
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--line)] bg-white/4 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--teal-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--teal)]">
                <BrainCircuit className="size-3.5" />
                AI Task Pack
              </div>
              <div className="mt-2 text-sm text-[var(--muted)]">
                Generate actionable daily, weekly, and weekend tasks from your stored progress.
              </div>
            </div>
            <button
              type="button"
              disabled={!aiReady || suggestionsLoading}
              onClick={onGenerateSuggestions}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                aiReady && !suggestionsLoading
                  ? "bg-[var(--ink)] text-[var(--paper-strong)]"
                  : "cursor-not-allowed bg-white/10 text-[var(--muted)]",
              )}
            >
              <Sparkles className={cn("size-4", suggestionsLoading && "animate-pulse")} />
              {suggestionsLoading ? "Thinking..." : "Generate suggestions"}
            </button>
          </div>

          {suggestions ? (
            <div className="grid gap-3 lg:grid-cols-3">
              {scopeOrder.map((scope) => (
                <div key={scope} className="soft-card space-y-3">
                  <div>
                    <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${scopeMeta[scope].tone}`}>
                      {scopeMeta[scope].label}
                    </div>
                    <div className="mt-2 text-xs leading-6 text-[var(--muted)]">
                      {scopeMeta[scope].subtitle}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {suggestions[scope].map((suggestion, index) => (
                      <div key={`${scope}-${index}-${suggestion.title}`} className="rounded-[18px] border border-[var(--line)] bg-black/20 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-semibold text-[var(--ink)]">
                            {suggestion.title}
                          </div>
                          <button
                            type="button"
                            onClick={() => onImportSuggestion(suggestion)}
                            className="rounded-full bg-[var(--ink)] px-3 py-1 text-xs font-medium text-[var(--paper-strong)]"
                          >
                            Add
                          </button>
                        </div>
                        <div className="mt-2 text-xs leading-6 text-[var(--muted)]">
                          {suggestion.details}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                          <span>{suggestion.category}</span>
                          <span>{suggestion.priority}</span>
                          <span>{suggestion.estimateMinutes} min</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-[var(--line)] bg-black/20 px-4 py-4 text-sm leading-7 text-[var(--muted)]">
              Generate a planner pack to get AI-suggested tasks that match your targets,
              weekly theme, current weakness areas, and recent study output.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[24px] border border-[var(--line)] bg-white/4 p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              <Plus className="size-3.5" />
              Add Planner Task
            </div>
            <div className="mt-2 text-sm text-[var(--muted)]">
              Save specific tasks instead of keeping your weekly intent in your head.
            </div>
          </div>
          <div className="rounded-full border border-[var(--line)] px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
            Today {todayKey}
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <input
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            className="field"
            placeholder="Task title"
          />
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
          <div className="grid grid-cols-[1fr_1fr] gap-3">
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
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
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
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_0.8fr_auto]">
          <textarea
            value={form.details}
            onChange={(event) =>
              setForm((current) => ({ ...current, details: event.target.value }))
            }
            className="field-area min-h-[92px]"
            placeholder="Optional detail, exit criteria, or the exact deliverable."
          />
          <div className="grid gap-3">
            <input
              type="date"
              value={form.targetDateKey}
              onChange={(event) =>
                setForm((current) => ({ ...current, targetDateKey: event.target.value }))
              }
              className="field"
              disabled={form.scope !== "daily"}
            />
            <div className="rounded-[16px] border border-[var(--line)] bg-black/20 px-3 py-3 text-xs leading-6 text-[var(--muted)]">
              Daily tasks can be date-specific. Weekly and weekend tasks stay visible until you complete them.
            </div>
          </div>
          <button
            type="button"
            onClick={onCreateTask}
            className="rounded-[18px] bg-[var(--ink)] px-5 py-4 text-sm font-semibold text-[var(--paper-strong)]"
          >
            Save task
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {groupedTasks.map(({ scope, tasks: scopedTasks }) => (
          <div key={scope} className="rounded-[24px] border border-[var(--line)] bg-white/4 p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${scopeMeta[scope].tone}`}>
                  {scopeMeta[scope].label}
                </div>
                <div className="mt-2 text-xs leading-6 text-[var(--muted)]">
                  {scopeMeta[scope].subtitle}
                </div>
              </div>
              <div className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]">
                {scopedTasks.length}
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {scopedTasks.length ? (
                  scopedTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className={cn(
                        "rounded-[18px] border p-4 transition",
                        task.status === "done"
                          ? "border-emerald-500/20 bg-emerald-500/8"
                          : "border-[var(--line)] bg-black/20",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-[var(--ink)]">{task.title}</div>
                          {task.details ? (
                            <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
                              {task.details}
                            </div>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          className="rounded-full border border-[var(--line)] p-2 text-[var(--muted)] hover:bg-white/6 hover:text-[var(--ink)]"
                          aria-label={`Delete ${task.title}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em]">
                        <span className="rounded-full bg-white/6 px-2.5 py-1 text-[var(--muted)]">
                          {task.category}
                        </span>
                        <span className="rounded-full bg-white/6 px-2.5 py-1 text-[var(--muted)]">
                          {task.priority}
                        </span>
                        <span className="rounded-full bg-white/6 px-2.5 py-1 text-[var(--muted)]">
                          {task.estimateMinutes} min
                        </span>
                        {task.targetDateKey ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/6 px-2.5 py-1 text-[var(--muted)]">
                            <CalendarRange className="size-3.5" />
                            {task.targetDateKey}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                          <Clock3 className="size-4" />
                          {task.status.replace("_", " ")}
                        </div>
                        <button
                          type="button"
                          onClick={() => onAdvanceTask(task, nextTaskStatus(task.status))}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition",
                            task.status === "done"
                              ? "bg-[var(--ink)] text-[var(--paper-strong)]"
                              : "bg-[var(--teal)] text-white",
                          )}
                        >
                          <CheckCircle2 className="size-4" />
                          {task.status === "todo"
                            ? "Start"
                            : task.status === "in_progress"
                              ? "Mark done"
                              : "Reopen"}
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-[18px] border border-dashed border-[var(--line)] px-4 py-6 text-sm leading-7 text-[var(--muted)]"
                  >
                    No {scope} tasks yet. Add one manually or import the AI suggestions.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlannerStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--line)] bg-black/20 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[var(--ink)]">{value}</div>
    </div>
  );
}

function nextTaskStatus(status: PlannerTaskStatus): PlannerTaskStatus {
  if (status === "todo") return "in_progress";
  if (status === "in_progress") return "done";
  return "todo";
}
