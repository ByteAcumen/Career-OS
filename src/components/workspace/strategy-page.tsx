"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Check, Copy, ExternalLink, FileText, LoaderCircle, ShieldCheck } from "lucide-react";

import { getWeaknessCurriculumAction } from "@/app/actions";
import { StudentStrategyPanel } from "@/components/student-strategy-panel";
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
import { scoreAts, openInOverleaf, type AtsScoreResult } from "@/lib/ats-scorer";
import type { StrategyPageData } from "@/lib/workspace-data";
import type { StudentStrategy } from "@/lib/types";

export function WorkspaceStrategyPage({
  data,
}: {
  data: StrategyPageData;
}) {
  const { setToast } = useWorkspaceUi();
  const [strategy, setStrategy] = useState<StudentStrategy | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [weakness, setWeakness] = useState("");
  const [weaknessPending, startWeaknessTransition] = useTransition();

  // Resume generator state
  const [resumeTab, setResumeTab] = useState<"markdown" | "latex">("markdown");
  const [resumeJobDesc, setResumeJobDesc] = useState("");
  const [resumeCompany, setResumeCompany] = useState("");
  const [resumeEmphasis, setResumeEmphasis] = useState<"balanced" | "projects" | "dsa">("balanced");
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeDraft, setResumeDraft] = useState<null | {
    markdown: string;
    latex: string;
    matchedKeywords: string[];
    editingNotes: string[];
    targetRole: string;
  }>(null);
  const [copied, setCopied] = useState(false);
  const [atsScore, setAtsScore] = useState<AtsScoreResult | null>(null);

  async function generateStrategy() {
    setStrategyLoading(true);

    try {
      const response = await postJson<{ strategy: StudentStrategy }>(
        "/api/ai/strategy",
        undefined,
        {
          method: "POST",
        },
      );
      setStrategy(response.strategy);
      setToast("AI strategy generated.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not generate the strategy.");
    } finally {
      setStrategyLoading(false);
    }
  }

  function generateWeaknessFocus() {
    startWeaknessTransition(() => {
      void getWeaknessCurriculumAction()
        .then((result) => {
          if (!result.ok) {
            throw new Error(result.error || "Could not generate the weakness focus.");
          }

          setWeakness(result.curriculum || "");
          setToast("Weakness focus generated.");
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

  async function generateResume() {
    setResumeLoading(true);
    setResumeDraft(null);
    try {
      const res = await fetch("/api/ai/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: resumeJobDesc || undefined,
          company: resumeCompany || undefined,
          emphasis: resumeEmphasis,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? "Resume generation failed.");
      }
      const payload = (await res.json()) as { resume: typeof resumeDraft };
      setResumeDraft(payload.resume);
      // Run ATS scorer client-side immediately
      if (payload.resume) {
        setAtsScore(scoreAts(payload.resume.markdown, resumeJobDesc));
      }
      setToast("Resume draft generated.");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not generate resume.");
    } finally {
      setResumeLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const recentPatterns = data.recentDsa.length
    ? data.recentDsa.map((item) => item.pattern).slice(0, 3).join(" | ")
    : "No recent DSA patterns saved yet.";
  const recentAreas = data.recentBuilds.length
    ? data.recentBuilds.map((item) => item.area).slice(0, 3).join(" | ")
    : "No recent build areas saved yet.";
  const recentStatuses = data.recentApplications.length
    ? data.recentApplications.map((item) => item.status).slice(0, 4).join(" | ")
    : "No recent application statuses yet.";

  return (
    <motion.div variants={sectionStagger} initial="hidden" animate="show" className="grid gap-5">
      <motion.div variants={riseIn}>
        <PageHeader
          eyebrow="Strategy"
          title="Use AI as a focused strategist, not as background noise."
          description="Strategy is a dedicated page for weekly direction, weak-spot prioritization, and recommendations grounded in the student data already stored in Career OS."
          actions={
            <>
              <ActionLink href="/planner" label="Open planner" />
              <ActionLink href="/progress" label="Open progress" />
            </>
          }
        />
      </motion.div>

      <motion.div variants={riseIn} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Weekly DSA"
          value={data.metrics.weekDsa}
          detail="Current DSA output used as a signal for AI planning."
        />
        <StatCard
          label="Weekly builds"
          value={data.metrics.weekBuilds}
          detail="Visible build momentum this week."
        />
        <StatCard
          label="Weekly apps"
          value={data.metrics.weekApplications}
          detail="Application pressure and follow-through."
        />
        <StatCard
          label="Open tasks"
          value={data.plannerSummary.active}
          detail="Active tasks still competing for attention."
        />
      </motion.div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <SectionCard
          eyebrow="Generate"
          title="AI strategy"
          description="Generate direction when the week needs correction, not continuously in the background."
        >
          <StudentStrategyPanel
            aiReady={data.integrations.aiReady}
            strategy={strategy}
            isLoading={strategyLoading}
            onGenerate={() => void generateStrategy()}
          />
        </SectionCard>

        <div className="grid gap-5">
          <SectionCard
            eyebrow="Context"
            title="Current operating context"
            description="These are the signals the strategy layer should anchor on before recommending anything."
          >
            <div className="grid gap-3">
              <InfoCard
                label="Primary goal"
                value={
                  data.settings.primaryGoal ||
                  "Add a clear goal in Settings so strategy recommendations become more specific."
                }
              />
              <InfoCard
                label="Target role"
                value={data.settings.targetRole || "No target role set yet."}
              />
              <InfoCard
                label="Weekly theme"
                value={data.settings.weeklyTheme || "No weekly theme set yet."}
              />
              <InfoCard
                label="AI readiness"
                value={
                  data.integrations.aiReady
                    ? "AI provider is ready for strategy generation."
                    : "Add or enable an AI provider in Settings first."
                }
              />
              <InfoCard
                label="Latest coach summary"
                value={
                  data.today.ai?.summary ||
                  "No saved coach summary yet. Generate a strategy when you need a fresh directional read."
                }
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Signals"
            title="What the strategist can see"
            description="The best strategy is grounded in real momentum, not generic advice."
          >
            <div className="grid gap-3">
              <InfoCard
                label="14-day activity"
                value={`${data.history
                  .slice(-14)
                  .reduce(
                    (sum, item) =>
                      sum + item.dsaCount + item.buildCount + item.appCount,
                    0,
                  )} logged outputs across the last 14 days.`}
              />
              <InfoCard label="Recent DSA patterns" value={recentPatterns} />
              <InfoCard label="Recent build areas" value={recentAreas} />
              <InfoCard label="Application pressure" value={recentStatuses} />
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          eyebrow="Weakness"
          title="Weakness focus"
          description="Use one weakness cluster at a time instead of trying to improve every topic at once."
          action={
            <button
              type="button"
              onClick={generateWeaknessFocus}
              disabled={weaknessPending}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/6 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
            >
              {weaknessPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <BrainCircuit className="size-4" />
              )}
              Generate weakness focus
            </button>
          }
        >
          {weakness ? (
            <InfoCard label="Next cluster to attack" value={weakness} />
          ) : (
            <EmptyPanel
              title="No weakness focus yet"
              description="Generate one after logging a few DSA entries and the AI will identify the highest-ROI topic cluster to attack next."
            />
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Execution"
          title="How to use this page well"
          description="Strategy should help you decide what changes this week, not become another feed to keep checking."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <InfoCard
              label="Best moment to generate"
              value="Use it when momentum slips, weekly targets drift, or your next moves feel unclear."
            />
            <InfoCard
              label="What to do after"
              value="Take the strongest recommendation and convert it into Planner tasks instead of leaving it as advice."
            />
            <InfoCard
              label="What improves output"
              value="Cleaner logging and sharper goals make strategy suggestions more specific and more honest."
            />
            <InfoCard
              label="What to avoid"
              value="Do not regenerate repeatedly for novelty. The goal is direction, not endless variation."
            />
          </div>
        </SectionCard>
      </div>

      {/* ── Resume Generator ── */}
      <motion.div variants={riseIn}>
        <SectionCard
          eyebrow="Resume"
          title="AI-tailored resume draft"
          description="Paste a job description to bias the project ordering and keyword matching toward the role. The draft is deterministic — it pulls only from your logged work."
          action={
            <button
              type="button"
              onClick={() => void generateResume()}
              disabled={resumeLoading}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/6 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
            >
              {resumeLoading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <FileText className="size-4" />
              )}
              Generate draft
            </button>
          }
        >
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="auth-label">Company (optional)</label>
                <input
                  id="resume-company"
                  type="text"
                  value={resumeCompany}
                  onChange={(e) => setResumeCompany(e.target.value)}
                  placeholder="e.g. Google, Stripe…"
                  className="field text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="auth-label">Emphasis</label>
                <select
                  id="resume-emphasis"
                  value={resumeEmphasis}
                  onChange={(e) => setResumeEmphasis(e.target.value as "balanced" | "projects" | "dsa")}
                  className="field text-sm"
                >
                  <option value="balanced">Balanced</option>
                  <option value="projects">Projects-first</option>
                  <option value="dsa">DSA-first</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="auth-label">Job description (optional — improves keyword matching)</label>
              <textarea
                id="resume-job-description"
                value={resumeJobDesc}
                onChange={(e) => setResumeJobDesc(e.target.value)}
                placeholder="Paste the full job description here…"
                rows={5}
                className="field-area text-sm"
              />
            </div>

            <AnimatePresence>
              {resumeDraft && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* ATS Score Panel */}
                  {atsScore && (
                    <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                            <ShieldCheck className="size-3.5" />
                            ATS Score
                          </div>
                          <div className="text-sm text-white/80">{atsScore.summary}</div>
                        </div>
                        <div className={`flex items-baseline gap-1 ${
                            atsScore.grade === "A" || atsScore.grade === "B" ? "text-green-400" :
                            atsScore.grade === "C" ? "text-amber-400" : "text-red-400"
                        }`}>
                          <span className="text-3xl font-semibold tracking-[-0.04em]">{atsScore.total}</span>
                          <span className="text-sm font-medium opacity-60">/100</span>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {atsScore.breakdown.map((b, i) => (
                          <div key={i} className="soft-card">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{b.label}</span>
                              <span className="text-xs font-semibold text-white/60">{b.score}/{b.max}</span>
                            </div>
                            <div className="mt-2 text-xs leading-5 text-white/80">{b.detail}</div>
                            {b.tips.length > 0 && b.score < b.max && (
                              <div className="mt-2 border-l-2 border-amber-500/50 pl-2 text-xs leading-5 text-[var(--muted)]">
                                {b.tips[0]}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {resumeDraft.matchedKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {resumeDraft.matchedKeywords.map((kw) => (
                        <span
                          key={kw}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tab bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-1 rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-1">
                      {(["markdown", "latex"] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setResumeTab(tab)}
                          className={`rounded-[10px] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                            resumeTab === tab
                              ? "bg-white text-black"
                              : "text-white/50 hover:text-white"
                          }`}
                        >
                          {tab === "markdown" ? "Markdown" : "LaTeX"}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {resumeTab === "latex" && (
                        <button
                          type="button"
                          onClick={() => openInOverleaf(resumeDraft.latex)}
                          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-neutral-200"
                        >
                          <ExternalLink className="size-3.5" />
                          Open in Overleaf
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            resumeTab === "markdown" ? resumeDraft.markdown : resumeDraft.latex,
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        {copied ? (
                          <Check className="size-3.5 text-green-400" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <pre
                    className="max-h-[420px] overflow-y-auto whitespace-pre-wrap break-words rounded-[22px] border border-white/[0.08] bg-black/40 p-5 text-[13px] leading-7 text-white/80"
                    style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.12) transparent" }}
                  >
                    {resumeTab === "markdown" ? resumeDraft.markdown : resumeDraft.latex}
                  </pre>

                  {/* Editing notes */}
                  {resumeDraft.editingNotes.length > 0 && (
                    <div className="rounded-[22px] border border-amber-400/20 bg-amber-400/5 p-4">
                      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400/80">
                        Editing notes
                      </div>
                      <ul className="space-y-2">
                        {resumeDraft.editingNotes.map((note, i) => (
                          <li key={i} className="flex gap-2 text-sm leading-6 text-white/70">
                            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-400/60" />
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {!resumeDraft && !resumeLoading && (
              <div className="rounded-[22px] border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-5 text-sm text-[var(--muted)]">
                No draft yet. Fill in the optional fields above for a more targeted output, then click &ldquo;Generate draft&rdquo;.
              </div>
            )}
          </div>
        </SectionCard>
      </motion.div>
    </motion.div>
  );
}
