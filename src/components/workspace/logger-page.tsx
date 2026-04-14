"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import {
  Briefcase,
  BrainCircuit,
  CheckCircle2,
  Code2,
  LoaderCircle,
  Rocket,
  Sparkles,
} from "lucide-react";

import { getWeaknessCurriculumAction, predictMatchAction } from "@/app/actions";
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
import type { LoggerPageData } from "@/lib/workspace-data";
import type { DashboardData } from "@/lib/types";

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

const buildAreas = ["React", "NestJS", "TypeScript", "AI", "System Design"] as const;
const applicationStatuses = [
  "Applied",
  "Referral asked",
  "OA scheduled",
  "Interview",
  "Rejected",
] as const;

export function WorkspaceLoggerPage({
  data: initialData,
}: {
  data: LoggerPageData;
}) {
  const { setToast } = useWorkspaceUi();
  const [data, setData] = useState(initialData);
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
  const [busy, startTransition] = useTransition();
  const [curriculum, setCurriculum] = useState("");
  const [curriculumPending, startCurriculumTransition] = useTransition();
  const [matchPreview, setMatchPreview] = useState<{
    score: number;
    analysis: string;
  } | null>(null);
  const [matchPending, startMatchTransition] = useTransition();

  async function saveDsa() {
    if (!dsaForm.title.trim()) {
      setToast("Add the DSA problem title first.");
      return;
    }

    try {
      const entry = await postJson<DashboardData["recentDsa"][number]>("/api/dsa", {
        dateKey: data.today.dateKey,
        ...dsaForm,
      });

      setData((current) => ({
        ...current,
        metrics: {
          ...current.metrics,
          weekDsa: current.metrics.weekDsa + 1,
        },
        recentDsa: [
          {
            ...entry,
            insight: (entry.insight ?? dsaForm.insight) || null,
            repositoryUrl: (entry.repositoryUrl ?? dsaForm.repositoryUrl) || null,
            createdAt:
              "createdAt" in entry ? entry.createdAt : new Date().toISOString(),
          },
          ...current.recentDsa,
        ].slice(0, 6),
      }));
      setDsaForm({
        title: "",
        difficulty: "Medium",
        pattern: "Sliding Window",
        insight: "",
        repositoryUrl: "",
      });
      setToast("DSA entry saved.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not save the DSA entry.");
    }
  }

  async function saveBuild() {
    if (!buildForm.title.trim()) {
      setToast("Add the build title first.");
      return;
    }

    try {
      const entry = await postJson<DashboardData["recentBuilds"][number]>("/api/builds", {
        dateKey: data.today.dateKey,
        ...buildForm,
      });

      setData((current) => ({
        ...current,
        metrics: {
          ...current.metrics,
          weekBuilds: current.metrics.weekBuilds + 1,
        },
        recentBuilds: [
          {
            ...entry,
            proof: (entry.proof ?? buildForm.proof) || null,
            impact: (entry.impact ?? buildForm.impact) || null,
            repositoryUrl: (entry.repositoryUrl ?? buildForm.repositoryUrl) || null,
            createdAt:
              "createdAt" in entry ? entry.createdAt : new Date().toISOString(),
          },
          ...current.recentBuilds,
        ].slice(0, 6),
      }));
      setBuildForm({
        title: "",
        area: "React",
        proof: "",
        impact: "",
        repositoryUrl: "",
      });
      setToast("Build entry saved.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not save the build entry.");
    }
  }

  async function saveApplication() {
    if (!applicationForm.company.trim() || !applicationForm.role.trim()) {
      setToast("Add both company and role before saving the application.");
      return;
    }

    try {
      const entry = await postJson<DashboardData["recentApplications"][number]>(
        "/api/applications",
        {
          dateKey: data.today.dateKey,
          ...applicationForm,
        },
      );

      setData((current) => ({
        ...current,
        metrics: {
          ...current.metrics,
          weekApplications: current.metrics.weekApplications + 1,
        },
        recentApplications: [
          {
            ...entry,
            note: (entry.note ?? applicationForm.note) || null,
            roleUrl: (entry.roleUrl ?? applicationForm.roleUrl) || null,
            syncedToSheet: "syncedToSheet" in entry ? entry.syncedToSheet : false,
            createdAt:
              "createdAt" in entry ? entry.createdAt : new Date().toISOString(),
          },
          ...current.recentApplications,
        ].slice(0, 8),
      }));
      setApplicationForm({
        company: "",
        role: "",
        status: "Applied",
        note: "",
        roleUrl: "",
      });
      setMatchPreview(null);
      setToast("Application saved.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not save the application.");
    }
  }

  function runCurriculum() {
    startCurriculumTransition(() => {
      void getWeaknessCurriculumAction()
        .then((result) => {
          if (!result.ok) {
            throw new Error(result.error || "Could not generate the weakness curriculum.");
          }

          setCurriculum(result.curriculum || "");
          setToast("AI weakness focus generated.");
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

  function runMatchPreview() {
    if (!applicationForm.company.trim() || !applicationForm.role.trim()) {
      setToast("Add a company and role first.");
      return;
    }

    startMatchTransition(() => {
      void predictMatchAction(applicationForm.company, applicationForm.role)
        .then((result) => {
          if (!result.ok || !result.data) {
            throw new Error(result.error || "Could not generate the fit preview.");
          }

          setMatchPreview(result.data);
          setToast("AI fit preview ready.");
        })
        .catch((error) => {
          setToast(
            error instanceof Error
              ? error.message
              : "Could not generate the fit preview.",
          );
        });
    });
  }

  return (
    <motion.div variants={sectionStagger} initial="hidden" animate="show" className="grid gap-6">
      <motion.div variants={riseIn}>
        <PageHeader
          eyebrow="Logger"
          title="Capture finished work without turning planning into form-filling."
          description="Logger is a dedicated workflow for DSA solves, build progress, and applications. Keep the entries specific here so Planner stays focused on sequencing the work."
          actions={
            <>
              <ActionLink href="/planner" label="Back to planner" />
              <ActionLink href="/strategy" label="Open strategy" />
            </>
          }
        />
      </motion.div>

      <motion.div variants={riseIn} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Week DSA"
          value={data.metrics.weekDsa}
          detail="Problems logged in the current week."
        />
        <StatCard
          label="Week builds"
          value={data.metrics.weekBuilds}
          detail="Build outputs captured this week."
        />
        <StatCard
          label="Week applications"
          value={data.metrics.weekApplications}
          detail="Applications stored this week."
        />
        <StatCard
          label="Target role"
          value={data.settings.targetRole || "Unset"}
          detail="Used by AI when generating fit and strategy signals."
        />
      </motion.div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.08fr)_0.92fr]">
        <div className="grid gap-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              eyebrow="DSA"
              title="Log DSA work"
              description="Capture the problem, the pattern, and one useful learning while the solve is still fresh."
              action={
                <button
                  type="button"
                  onClick={() => startTransition(() => void saveDsa())}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-neutral-200"
                >
                  {busy ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Save
                </button>
              }
            >
              <div className="grid gap-3">
                <input
                  value={dsaForm.title}
                  onChange={(event) =>
                    setDsaForm((current) => ({ ...current, title: event.target.value }))
                  }
                  className="field"
                  placeholder="Problem title"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={dsaForm.difficulty}
                    onChange={(event) =>
                      setDsaForm((current) => ({
                        ...current,
                        difficulty: event.target.value,
                      }))
                    }
                    className="field"
                  >
                    {["Easy", "Medium", "Hard"].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select
                    value={dsaForm.pattern}
                    onChange={(event) =>
                      setDsaForm((current) => ({
                        ...current,
                        pattern: event.target.value,
                      }))
                    }
                    className="field"
                  >
                    {dsaPatterns.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={dsaForm.insight}
                  onChange={(event) =>
                    setDsaForm((current) => ({ ...current, insight: event.target.value }))
                  }
                  className="field-area min-h-[120px]"
                  placeholder="What pattern, mistake, or insight is worth remembering?"
                />
                <input
                  value={dsaForm.repositoryUrl}
                  onChange={(event) =>
                    setDsaForm((current) => ({
                      ...current,
                      repositoryUrl: event.target.value,
                    }))
                  }
                  className="field"
                  placeholder="Optional proof link"
                />
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Build"
              title="Log build work"
              description="Track visible proof and the impact so Progress stays meaningful."
              action={
                <button
                  type="button"
                  onClick={() => startTransition(() => void saveBuild())}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-neutral-200"
                >
                  {busy ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Save
                </button>
              }
            >
              <div className="grid gap-3">
                <input
                  value={buildForm.title}
                  onChange={(event) =>
                    setBuildForm((current) => ({ ...current, title: event.target.value }))
                  }
                  className="field"
                  placeholder="Feature or project title"
                />
                <select
                  value={buildForm.area}
                  onChange={(event) =>
                    setBuildForm((current) => ({ ...current, area: event.target.value }))
                  }
                  className="field"
                >
                  {buildAreas.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <textarea
                  value={buildForm.proof}
                  onChange={(event) =>
                    setBuildForm((current) => ({ ...current, proof: event.target.value }))
                  }
                  className="field-area min-h-[96px]"
                  placeholder="What exactly shipped, changed, or became visible?"
                />
                <textarea
                  value={buildForm.impact}
                  onChange={(event) =>
                    setBuildForm((current) => ({ ...current, impact: event.target.value }))
                  }
                  className="field-area min-h-[96px]"
                  placeholder="Why does this matter? What capability does it prove?"
                />
                <input
                  value={buildForm.repositoryUrl}
                  onChange={(event) =>
                    setBuildForm((current) => ({
                      ...current,
                      repositoryUrl: event.target.value,
                    }))
                  }
                  className="field"
                  placeholder="Optional repo or deploy link"
                />
              </div>
            </SectionCard>
          </div>

          <SectionCard
            eyebrow="Recent"
            title="Recent proof of work"
            description="The newest DSA, build, and application evidence stays visible so logging has immediate value."
          >
            <div className="grid gap-6 xl:grid-cols-3">
              <RecentLogColumn
                title="Recent DSA"
                icon={Code2}
                emptyText="Your latest problem solves will appear here."
                items={data.recentDsa.map((item) => ({
                  id: item.id,
                  title: item.title,
                  subtitle: `${item.difficulty} - ${item.pattern}`,
                  body: item.insight || "No insight saved yet.",
                  href: item.repositoryUrl ?? undefined,
                  createdAt: item.createdAt,
                }))}
              />
              <RecentLogColumn
                title="Recent builds"
                icon={Rocket}
                emptyText="Your latest shipped build work will appear here."
                items={data.recentBuilds.map((item) => ({
                  id: item.id,
                  title: item.title,
                  subtitle: item.area,
                  body: item.impact || item.proof || "No build proof saved yet.",
                  href: item.repositoryUrl ?? undefined,
                  createdAt: item.createdAt,
                }))}
              />
              <RecentLogColumn
                title="Recent applications"
                icon={Briefcase}
                emptyText="Stored roles and statuses will appear here."
                items={data.recentApplications.map((item) => ({
                  id: item.id,
                  title: `${item.role} at ${item.company}`,
                  subtitle: item.status,
                  body: item.note || "No note saved.",
                  href: item.roleUrl ?? undefined,
                  createdAt: item.createdAt,
                }))}
              />
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6">
          <SectionCard
            eyebrow="Applications"
            title="Log applications"
            description="Store roles, status, and follow-up context here so Planner never has to carry job-tracking forms."
            action={
              <button
                type="button"
                onClick={() => startTransition(() => void saveApplication())}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-neutral-200"
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Save
              </button>
            }
          >
            <div className="grid gap-3">
              <input
                value={applicationForm.company}
                onChange={(event) =>
                  setApplicationForm((current) => ({
                    ...current,
                    company: event.target.value,
                  }))
                }
                className="field"
                placeholder="Company"
              />
              <input
                value={applicationForm.role}
                onChange={(event) =>
                  setApplicationForm((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
                className="field"
                placeholder="Role"
              />
              <select
                value={applicationForm.status}
                onChange={(event) =>
                  setApplicationForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                className="field"
              >
                {applicationStatuses.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <textarea
                value={applicationForm.note}
                onChange={(event) =>
                  setApplicationForm((current) => ({ ...current, note: event.target.value }))
                }
                className="field-area min-h-[100px]"
                placeholder="Optional note, referral context, or follow-up reminder"
              />
              <input
                value={applicationForm.roleUrl}
                onChange={(event) =>
                  setApplicationForm((current) => ({
                    ...current,
                    roleUrl: event.target.value,
                  }))
                }
                className="field"
                placeholder="Job post link"
              />
              <button
                type="button"
                onClick={runMatchPreview}
                disabled={matchPending}
                className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[var(--line)] bg-white/[0.04] px-4 py-3 text-sm font-medium text-white hover:bg-white/[0.08] disabled:opacity-50"
              >
                {matchPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Preview fit with AI
              </button>
              {matchPreview ? (
                <div className="rounded-[22px] border border-[var(--line)] bg-white/[0.03] px-4 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    Match preview
                  </div>
                  <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    {matchPreview.score}/100
                  </div>
                  <div className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    {matchPreview.analysis}
                  </div>
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Assistant"
            title="AI helper"
            description="AI stays close to the work you are logging instead of taking over the page."
            action={
              <button
                type="button"
                onClick={runCurriculum}
                disabled={curriculumPending}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/6 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
              >
                {curriculumPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <BrainCircuit className="size-4" />
                )}
                Weakest topic next
              </button>
            }
          >
            <div className="grid gap-3">
              <InfoCard
                label="Current role target"
                value={
                  data.settings.targetRole ||
                  "Add a target role in Settings for more precise AI guidance."
                }
              />
              <InfoCard
                label="Current weekly theme"
                value={data.settings.weeklyTheme || "No weekly theme set yet."}
              />
              <InfoCard
                label="Why Logger exists"
                value="Keep capture fast here so Home can stay summary-first and Planner can stay focused on sequencing work."
                muted
              />
              {curriculum ? (
                <InfoCard label="Weakness focus" value={curriculum} />
              ) : (
                <EmptyPanel
                  title="No weakness focus generated yet"
                  description="Use the button above after logging a few DSA problems and AI will suggest the highest-value topic cluster to attack next."
                />
              )}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Quality"
            title="What good logging looks like"
            description="The cleaner the inputs, the better your Progress page, AI coach, and weekly review become."
          >
            <div className="grid gap-3">
              <InfoCard
                label="DSA entries"
                value="Save the problem name, pattern, and one repeatable insight. That gives the strategy layer something concrete to work with."
              />
              <InfoCard
                label="Build entries"
                value="Log visible outputs and why they matter. Avoid vague notes that do not prove capability."
              />
              <InfoCard
                label="Applications"
                value="Store role, company, and the current status so follow-up pressure stays visible."
              />
              <InfoCard
                label="Proof links"
                value="When you have a repo, deployment, or posting link, attach it here so the evidence stays connected."
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </motion.div>
  );
}

function RecentLogColumn({
  title,
  icon: Icon,
  items,
  emptyText,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    body: string;
    createdAt: string;
    href?: string;
  }>;
  emptyText: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-white/[0.02] p-4 sm:p-5">
      <div className="mb-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          {title}
        </div>
        <div className="mt-2 text-sm leading-7 text-[var(--muted)]">
          The latest evidence stays visible so logging has immediate value.
        </div>
      </div>

      {items.length ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="soft-card">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                <Icon className="size-3.5 text-white" />
                {format(parseISO(item.createdAt), "MMM d")}
              </div>
              <div className="mt-3 text-sm font-medium text-white">{item.title}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                {item.subtitle}
              </div>
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
      ) : (
        <EmptyPanel title="Nothing logged yet" description={emptyText} />
      )}
    </div>
  );
}
