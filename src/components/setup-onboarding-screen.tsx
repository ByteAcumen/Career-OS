"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  CircleAlert,
  KeyRound,
  Loader2,
  Sparkles,
  UserRound,
} from "lucide-react";

import type { AiProvider, AiProviderSource, DashboardData } from "@/lib/types";

type SetupSettings = Pick<
  DashboardData["settings"],
  | "primaryGoal"
  | "targetRole"
  | "university"
  | "degree"
  | "graduationYear"
  | "planStyle"
  | "linkedinUrl"
  | "jobTrackerUrl"
  | "githubUrl"
  | "leetcodeUrl"
  | "portfolioUrl"
  | "resumeUrl"
  | "customAiInstructions"
  | "aiProvider"
>;

type ProviderState = Record<AiProvider, boolean>;
type ProviderSourceState = Record<AiProvider, AiProviderSource>;

type SetupOnboardingScreenProps = {
  currentUser: {
    name: string;
    email: string;
  };
  initialSettings: SetupSettings;
  missingFieldLabels: string[];
  savedApiKeys: ProviderState;
  providerSources: ProviderSourceState;
};

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

const providerLabels: Record<AiProvider, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  openrouter: "OpenRouter",
};

export function SetupOnboardingScreen({
  currentUser,
  initialSettings,
  missingFieldLabels,
  savedApiKeys,
  providerSources,
}: SetupOnboardingScreenProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState<SetupSettings>(initialSettings);
  const [keys, setKeys] = useState<Record<AiProvider, string>>({
    openai: "",
    gemini: "",
    openrouter: "",
  });

  const requiredStatus = useMemo(() => {
    const values = [
      form.primaryGoal,
      form.targetRole,
      form.university,
      form.planStyle,
      form.linkedinUrl,
      form.jobTrackerUrl,
    ];

    const completed = values.filter((item) => item.trim().length > 0).length;
    return {
      completed,
      total: values.length,
      percentage: Math.round((completed / values.length) * 100),
    };
  }, [
    form.jobTrackerUrl,
    form.linkedinUrl,
    form.planStyle,
    form.primaryGoal,
    form.targetRole,
    form.university,
  ]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          linkedinUrl: normalizeUrl(form.linkedinUrl),
          jobTrackerUrl: normalizeUrl(form.jobTrackerUrl),
          githubUrl: normalizeUrl(form.githubUrl),
          leetcodeUrl: normalizeUrl(form.leetcodeUrl),
          portfolioUrl: normalizeUrl(form.portfolioUrl),
          resumeUrl: normalizeUrl(form.resumeUrl),
          aiKeys: keys,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.message || "Could not save onboarding details. Please try again.",
        );
      }

      setSuccessMessage("Setup saved. Opening your workspace...");
      router.replace("/home");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not complete setup right now.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto grid w-full max-w-[1160px] gap-6 lg:grid-cols-[1.65fr_1fr]">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="glass-card rounded-[32px] p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-6">
            <div>
              <div className="page-pill">First-time setup</div>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
                Welcome, {currentUser.name || "Student"}.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                Add your core profile and links so Career OS can personalize planning and
                AI suggestions from day one.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white/[0.03] px-4 py-3 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Setup progress
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {requiredStatus.completed}/{requiredStatus.total}
              </p>
              <p className="text-sm text-[var(--muted)]">{requiredStatus.percentage}% complete</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-6">
            <section className="grid gap-4 rounded-[24px] border border-[var(--line)] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                <UserRound className="size-3.5" />
                Profile and goals
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-white">
                  Target role
                  <input
                    required
                    value={form.targetRole}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, targetRole: event.target.value }))
                    }
                    className="field"
                    placeholder="Software Engineer"
                  />
                </label>
                <label className="grid gap-2 text-sm text-white">
                  University
                  <input
                    required
                    value={form.university}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, university: event.target.value }))
                    }
                    className="field"
                    placeholder="Your college/university"
                  />
                </label>
                <label className="grid gap-2 text-sm text-white">
                  Degree
                  <input
                    value={form.degree}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, degree: event.target.value }))
                    }
                    className="field"
                    placeholder="B.Tech / B.E / M.Tech"
                  />
                </label>
                <label className="grid gap-2 text-sm text-white">
                  Graduation year
                  <input
                    value={form.graduationYear}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        graduationYear: event.target.value,
                      }))
                    }
                    className="field"
                    placeholder="2027"
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm text-white">
                Primary goal
                <textarea
                  required
                  value={form.primaryGoal}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, primaryGoal: event.target.value }))
                  }
                  className="field-area"
                  placeholder="Example: Land a backend role by shipping 3 solid projects and hitting weekly DSA targets."
                />
              </label>
              <label className="grid gap-2 text-sm text-white">
                Planning style
                <textarea
                  required
                  value={form.planStyle}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, planStyle: event.target.value }))
                  }
                  className="field-area"
                  placeholder="Structured, realistic, and student-focused."
                />
              </label>
            </section>

            <section className="grid gap-4 rounded-[24px] border border-[var(--line)] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                <Sparkles className="size-3.5" />
                Career links
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-white">
                  LinkedIn URL
                  <input
                    required
                    value={form.linkedinUrl}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, linkedinUrl: event.target.value }))
                    }
                    className="field"
                    placeholder="https://linkedin.com/in/username"
                  />
                </label>
                <label className="grid gap-2 text-sm text-white">
                  Job tracker URL
                  <input
                    required
                    value={form.jobTrackerUrl}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, jobTrackerUrl: event.target.value }))
                    }
                    className="field"
                    placeholder="https://notion.so/... or your tracker"
                  />
                </label>
                <label className="grid gap-2 text-sm text-white">
                  GitHub URL
                  <input
                    value={form.githubUrl}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, githubUrl: event.target.value }))
                    }
                    className="field"
                    placeholder="https://github.com/your-handle"
                  />
                </label>
                <label className="grid gap-2 text-sm text-white">
                  LeetCode URL
                  <input
                    value={form.leetcodeUrl}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, leetcodeUrl: event.target.value }))
                    }
                    className="field"
                    placeholder="https://leetcode.com/your-handle"
                  />
                </label>
                <label className="grid gap-2 text-sm text-white">
                  Portfolio URL
                  <input
                    value={form.portfolioUrl}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, portfolioUrl: event.target.value }))
                    }
                    className="field"
                    placeholder="https://your-portfolio.com"
                  />
                </label>
                <label className="grid gap-2 text-sm text-white">
                  Resume URL
                  <input
                    value={form.resumeUrl}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, resumeUrl: event.target.value }))
                    }
                    className="field"
                    placeholder="Public resume link"
                  />
                </label>
              </div>
            </section>

            <section className="grid gap-4 rounded-[24px] border border-[var(--line)] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                <KeyRound className="size-3.5" />
                AI setup (optional now, recommended)
              </div>

              <label className="grid gap-2 text-sm text-white">
                Preferred provider
                <select
                  value={form.aiProvider}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      aiProvider: event.target.value as AiProvider,
                    }))
                  }
                  className="field"
                >
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Gemini</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                {(Object.keys(providerLabels) as AiProvider[]).map((provider) => (
                  <label key={provider} className="grid gap-2 text-sm text-white">
                    {providerLabels[provider]} key
                    <input
                      value={keys[provider]}
                      onChange={(event) =>
                        setKeys((current) => ({
                          ...current,
                          [provider]: event.target.value,
                        }))
                      }
                      className="field"
                      type="password"
                      autoComplete="off"
                      placeholder={
                        savedApiKeys[provider]
                          ? "Already saved. Enter to replace"
                          : "Paste key (optional)"
                      }
                    />
                    <span className="text-xs text-[var(--muted)]">
                      {savedApiKeys[provider]
                        ? `Saved (${providerSources[provider]} source)`
                        : "Not connected yet"}
                    </span>
                  </label>
                ))}
              </div>

              <label className="grid gap-2 text-sm text-white">
                AI coaching instructions (optional)
                <textarea
                  value={form.customAiInstructions}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      customAiInstructions: event.target.value,
                    }))
                  }
                  className="field-area"
                  placeholder="Share constraints, focus areas, weaknesses, preferred interview domains, or daily schedule limits."
                />
              </label>
            </section>

            {errorMessage ? (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {errorMessage}
              </div>
            ) : null}
            {successMessage ? (
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white">
                {successMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
              <p className="text-sm text-[var(--muted)]">
                Signed in as <span className="text-white">{currentUser.email}</span>
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-65"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue to workspace
                    <CheckCircle2 className="size-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.04 }}
          className="grid gap-4"
        >
          <section className="glass-card rounded-[28px] p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              <CircleAlert className="size-3.5" />
              Why this matters
            </div>
            <ul className="mt-4 grid gap-3 text-sm leading-7 text-[var(--muted)]">
              <li>Personalized weekly plans based on your role, goal, and profile.</li>
              <li>Safer per-user AI usage with stored encrypted credentials.</li>
              <li>Cleaner dashboard suggestions from your real preparation context.</li>
            </ul>
          </section>

          <section className="glass-card rounded-[28px] p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              <Bot className="size-3.5" />
              Missing now
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {missingFieldLabels.length > 0 ? (
                missingFieldLabels.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[var(--line)] bg-white/[0.04] px-3 py-1 text-xs text-white"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span className="text-sm text-[var(--muted)]">All required fields are filled.</span>
              )}
            </div>
          </section>
        </motion.aside>
      </div>
    </main>
  );
}

