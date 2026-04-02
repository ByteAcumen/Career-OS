"use client";

import { motion } from "framer-motion";
import { GraduationCap, Rocket, Sparkles, Target, X } from "lucide-react";

import type { DashboardData } from "@/lib/types";

type SettingsForm = DashboardData["settings"];

export function StudentOnboarding({
  settings,
  setSettings,
  onSave,
  onDismiss,
}: {
  settings: SettingsForm;
  setSettings: React.Dispatch<React.SetStateAction<SettingsForm | null>>;
  onSave: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-card custom-scrollbar w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] border border-white/10 p-6 sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--teal-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">
              <Sparkles className="size-3.5" />
              Personalized Setup
            </div>
            <h2 className="mt-4 text-3xl font-semibold">Make Career OS yours.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Add your student profile, targets, links, and planning style so the app
              can stop behaving like a generic tracker and start giving useful,
              student-specific guidance.
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="rounded-full border border-[var(--line)] p-2 text-[var(--muted)] transition hover:bg-[var(--line)] hover:text-[var(--ink)]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--teal)]">
              <GraduationCap className="size-4" />
              Student Profile
            </div>

            <input
              value={settings.university}
              onChange={(event) =>
                setSettings((current) =>
                  current ? { ...current, university: event.target.value } : current,
                )
              }
              className="field"
              placeholder="University or college"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={settings.degree}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, degree: event.target.value } : current,
                  )
                }
                className="field"
                placeholder="Degree / stream"
              />
              <input
                value={settings.graduationYear}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, graduationYear: event.target.value } : current,
                  )
                }
                className="field"
                placeholder="Graduation year"
              />
            </div>

            <div className="flex items-center gap-2 pt-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--teal)]">
              <Target className="size-4" />
              Career Targets
            </div>

            <input
              value={settings.targetRole}
              onChange={(event) =>
                setSettings((current) =>
                  current ? { ...current, targetRole: event.target.value } : current,
                )
              }
              className="field"
              placeholder="Target role"
            />
            <textarea
              value={settings.primaryGoal}
              onChange={(event) =>
                setSettings((current) =>
                  current ? { ...current, primaryGoal: event.target.value } : current,
                )
              }
              className="field-area"
              placeholder="What outcome are you chasing over the next 3-6 months?"
            />
            <textarea
              value={settings.targetCompanies}
              onChange={(event) =>
                setSettings((current) =>
                  current ? { ...current, targetCompanies: event.target.value } : current,
                )
              }
              className="field-area"
              placeholder="Target companies or role buckets"
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--teal)]">
              <Rocket className="size-4" />
              Links, Resume, and Planning Inputs
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={settings.githubUrl}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, githubUrl: event.target.value } : current,
                  )
                }
                className="field"
                placeholder="GitHub profile URL"
              />
              <input
                value={settings.linkedinUrl}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, linkedinUrl: event.target.value } : current,
                  )
                }
                className="field"
                placeholder="LinkedIn profile URL"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={settings.leetcodeUrl}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, leetcodeUrl: event.target.value } : current,
                  )
                }
                className="field"
                placeholder="LeetCode URL"
              />
              <input
                value={settings.jobTrackerUrl}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, jobTrackerUrl: event.target.value } : current,
                  )
                }
                className="field"
                placeholder="Job tracker URL"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={settings.resumeUrl}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, resumeUrl: event.target.value } : current,
                  )
                }
                className="field"
                placeholder="Resume URL"
              />
              <input
                value={settings.portfolioUrl}
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, portfolioUrl: event.target.value } : current,
                  )
                }
                className="field"
                placeholder="Portfolio URL"
              />
            </div>
            <textarea
              value={settings.planStyle}
              onChange={(event) =>
                setSettings((current) =>
                  current ? { ...current, planStyle: event.target.value } : current,
                )
              }
              className="field-area"
              placeholder="How should the app plan your work? Strict, balanced, office-friendly, high-intensity..."
            />
            <textarea
              value={settings.customAiInstructions}
              onChange={(event) =>
                setSettings((current) =>
                  current
                    ? { ...current, customAiInstructions: event.target.value }
                    : current,
                )
              }
              className="field-area"
              placeholder="Anything the AI coach should know about your preparation style, weak spots, or constraints"
            />
          </section>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={onSave}
            className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--paper-strong)]"
          >
            Save workspace setup
          </button>
          <button
            onClick={onDismiss}
            className="rounded-full border border-[var(--line)] px-5 py-3 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--line)]"
          >
            I&apos;ll finish this later
          </button>
        </div>
      </motion.div>
    </div>
  );
}
