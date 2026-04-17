"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Link2,
  ShieldCheck,
  Sparkles,
  Target,
  User,
} from "lucide-react";

import type { AiProvider, WorkspaceSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

function SettingsSection({
  icon,
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="glass-card overflow-hidden rounded-[24px] border border-[var(--line)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03]"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[16px] border border-[var(--line)] bg-white/[0.04] text-white">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold tracking-tight text-white">{title}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">{subtitle}</div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          className="rounded-full border border-[var(--line)] bg-white/[0.04] p-1.5 text-[var(--muted)]"
        >
          <ChevronDown className="size-4" />
        </motion.div>
      </button>

      {open ? (
        <div className="border-t border-[var(--line)] bg-white/[0.02] px-5 pb-5 pt-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field"
        placeholder={placeholder}
      />
    </label>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
  placeholder,
  description,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  description?: string;
}) {
  return (
    <label className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          {label}
        </span>
        {description ? (
          <span className="text-[11px] text-[var(--muted)]">{description}</span>
        ) : null}
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-area min-h-[96px]"
        placeholder={placeholder}
      />
    </label>
  );
}

interface SettingsPanelProps {
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
  onSave: () => void;
  aiKeyManager: ReactNode;
}

export function SettingsPanel({
  settings,
  setSettings,
  onSave,
  aiKeyManager,
}: SettingsPanelProps) {
  function update<K extends keyof WorkspaceSettings>(key: K, value: WorkspaceSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="grid gap-4">
        <SettingsSection
          icon={<User className="size-5" />}
          title="Profile & identity"
          subtitle="Role, education, and career targets"
          defaultOpen
        >
          <div className="grid gap-4">
            <FieldTextarea
              label="Primary goal"
              description="Used by planning and AI guidance"
              value={settings.primaryGoal}
              onChange={(value) => update("primaryGoal", value)}
              placeholder="Land a strong software engineering role through consistent prep and visible proof of work."
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <FieldInput
                label="Target role"
                value={settings.targetRole}
                onChange={(value) => update("targetRole", value)}
                placeholder="Software Engineer"
              />
              <FieldInput
                label="Graduation year"
                value={settings.graduationYear}
                onChange={(value) => update("graduationYear", value)}
                placeholder="2026"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FieldInput
                label="University"
                value={settings.university}
                onChange={(value) => update("university", value)}
                placeholder="University or college"
              />
              <FieldInput
                label="Degree or program"
                value={settings.degree}
                onChange={(value) => update("degree", value)}
                placeholder="B.Tech CSE"
              />
            </div>

            <FieldTextarea
              label="Target companies or tracks"
              value={settings.targetCompanies}
              onChange={(value) => update("targetCompanies", value)}
              placeholder="Product startups, backend-heavy roles, campus placements..."
            />
          </div>
        </SettingsSection>

        <SettingsSection
          icon={<Sparkles className="size-4" />}
          title="AI & strategy"
          subtitle="Provider, model, coaching style, and weekly direction"
        >
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  AI provider
                </span>
                <select
                  value={settings.aiProvider}
                  onChange={(event) => {
                    const provider = event.target.value as AiProvider;
                    const modelMap: Record<AiProvider, string> = {
                      openai: "gpt-4o-mini",
                      gemini: "gemini-2.5-flash",
                      openrouter: "openrouter/auto",
                      groq: "llama-3.1-70b-versatile",
                    };
                    update("aiProvider", provider);
                    update("openAiModel", modelMap[provider]);
                  }}
                  className="field"
                >
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Gemini</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="groq">Groq (free tier)</option>
                </select>
              </label>

              <FieldInput
                label="AI model string"
                value={settings.openAiModel}
                onChange={(value) => update("openAiModel", value)}
                placeholder="gpt-4o-mini"
              />
            </div>

            <FieldTextarea
              label="Planning style"
              value={settings.planStyle}
              onChange={(value) => update("planStyle", value)}
              placeholder="Strict weekday routine, balanced weekends, DSA first..."
            />

            <FieldInput
              label="Weekly theme"
              value={settings.weeklyTheme}
              onChange={(value) => update("weeklyTheme", value)}
              placeholder="Graphs and backend systems"
            />

            <FieldTextarea
              label="Custom AI instructions"
              value={settings.customAiInstructions}
              onChange={(value) => update("customAiInstructions", value)}
              placeholder="Tell the coach about weak topics, constraints, or feedback preferences."
            />

            <div className="rounded-[24px] border border-[var(--line)] bg-white/[0.03] p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                <ShieldCheck className="size-4" />
                Per-user API keys
              </div>
              <p className="mb-4 text-[11px] leading-5 text-[var(--muted)]">
                Keys are encrypted before storage and never returned to the browser.
                Only your workspace uses them.
              </p>
              {aiKeyManager}
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={<Link2 className="size-4" />}
          title="Links & trackers"
          subtitle="Profiles, portfolio, sheets, and supporting systems"
        >
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldInput
                label="Application sheet URL"
                value={settings.sheetUrl}
                onChange={(value) => update("sheetUrl", value)}
                placeholder="Google Sheet or Airtable URL"
              />
              <FieldInput
                label="Google Apps Script URL"
                value={settings.googleAppsScriptUrl}
                onChange={(value) => update("googleAppsScriptUrl", value)}
                placeholder="Apps Script endpoint"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <FieldInput
                label="Resume URL"
                value={settings.resumeUrl}
                onChange={(value) => update("resumeUrl", value)}
                placeholder="Drive or PDF link"
              />
              <FieldInput
                label="GitHub"
                value={settings.githubUrl}
                onChange={(value) => update("githubUrl", value)}
                placeholder="GitHub profile"
              />
              <FieldInput
                label="LeetCode"
                value={settings.leetcodeUrl}
                onChange={(value) => update("leetcodeUrl", value)}
                placeholder="LeetCode profile"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <FieldInput
                label="LinkedIn"
                value={settings.linkedinUrl}
                onChange={(value) => update("linkedinUrl", value)}
                placeholder="LinkedIn profile"
              />
              <FieldInput
                label="Portfolio"
                value={settings.portfolioUrl}
                onChange={(value) => update("portfolioUrl", value)}
                placeholder="Portfolio or personal site"
              />
              <FieldInput
                label="Job tracker board"
                value={settings.jobTrackerUrl}
                onChange={(value) => update("jobTrackerUrl", value)}
                placeholder="Notion or dashboard"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <FieldInput
                label="Codeforces"
                value={settings.codeforcesUrl}
                onChange={(value) => update("codeforcesUrl", value)}
                placeholder="Codeforces profile"
              />
              <FieldInput
                label="CodeChef"
                value={settings.codechefUrl}
                onChange={(value) => update("codechefUrl", value)}
                placeholder="CodeChef profile"
              />
              <FieldInput
                label="HackerRank"
                value={settings.hackerrankUrl}
                onChange={(value) => update("hackerrankUrl", value)}
                placeholder="HackerRank profile"
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={<Target className="size-4" />}
          title="Targets & schedule"
          subtitle="Weekly goals, block lengths, and focus timer defaults"
        >
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <FieldInput
                label="Weekly DSA target"
                type="number"
                value={settings.weeklyDsaTarget}
                onChange={(value) => update("weeklyDsaTarget", Number(value))}
              />
              <FieldInput
                label="Weekly apps target"
                type="number"
                value={settings.weeklyApplicationTarget}
                onChange={(value) =>
                  update("weeklyApplicationTarget", Number(value))
                }
              />
              <FieldInput
                label="Weekly build target"
                type="number"
                value={settings.weeklyBuildTarget}
                onChange={(value) => update("weeklyBuildTarget", Number(value))}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FieldInput
                label="Weekday task target"
                type="number"
                value={settings.weekdayTaskTarget}
                onChange={(value) => update("weekdayTaskTarget", Number(value))}
              />
              <FieldInput
                label="Weekend task target"
                type="number"
                value={settings.weekendTaskTarget}
                onChange={(value) => update("weekendTaskTarget", Number(value))}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FieldInput
                label="Weekend DSA minutes"
                type="number"
                value={settings.weekendDsaMinutes}
                onChange={(value) => update("weekendDsaMinutes", Number(value))}
              />
              <FieldInput
                label="Weekend build minutes"
                type="number"
                value={settings.weekendBuildMinutes}
                onChange={(value) => update("weekendBuildMinutes", Number(value))}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FieldInput
                label="Weekday deep work minutes"
                type="number"
                value={settings.weekdayDeepWorkMinutes}
                onChange={(value) =>
                  update("weekdayDeepWorkMinutes", Number(value))
                }
              />
              <FieldInput
                label="Weekday support minutes"
                type="number"
                value={settings.weekdaySupportMinutes}
                onChange={(value) => update("weekdaySupportMinutes", Number(value))}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FieldInput
                label="Focus timer"
                type="number"
                value={settings.timerFocusMinutes}
                onChange={(value) => update("timerFocusMinutes", Number(value))}
              />
              <FieldInput
                label="Break timer"
                type="number"
                value={settings.timerBreakMinutes}
                onChange={(value) => update("timerBreakMinutes", Number(value))}
              />
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-white/[0.03] px-4 py-3 text-xs text-[var(--muted)]">
              Weekend template reserves{" "}
              <strong className="text-white">
                {settings.weekendDsaMinutes + settings.weekendBuildMinutes}
              </strong>{" "}
              focused minutes across DSA and project work.
            </div>
          </div>
        </SettingsSection>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSave}
            className={cn(
              "inline-flex min-w-[148px] items-center justify-center whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all",
              "hover:-translate-y-0.5 hover:bg-neutral-200 active:scale-[0.99]",
            )}
          >
            Save all settings
          </button>
        </div>
    </div>
  );
}
