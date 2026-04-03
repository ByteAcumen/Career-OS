"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Globe,
  GraduationCap,
  Link2,
  Sparkles,
  Target,
  Timer,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types — keep in sync with tracker-dashboard                        */
/* ------------------------------------------------------------------ */
export type AiProvider = "openai" | "gemini" | "openrouter";

export interface SettingsForm {
  primaryGoal: string;
  targetRole: string;
  graduationYear: string;
  university: string;
  degree: string;
  targetCompanies: string;
  planStyle: string;
  weeklyTheme: string;
  customAiInstructions: string;
  sheetUrl: string;
  googleAppsScriptUrl: string;
  resumeUrl: string;
  githubUrl: string;
  leetcodeUrl: string;
  linkedinUrl: string;
  portfolioUrl: string;
  jobTrackerUrl: string;
  codeforcesUrl: string;
  codechefUrl: string;
  hackerrankUrl: string;
  aiProvider: AiProvider;
  openAiModel: string;
  weeklyDsaTarget: number;
  weeklyApplicationTarget: number;
  weeklyBuildTarget: number;
  weekdayTaskTarget: number;
  weekendTaskTarget: number;
  weekendDsaMinutes: number;
  weekendBuildMinutes: number;
  weekdayDeepWorkMinutes: number;
  weekdaySupportMinutes: number;
  timerFocusMinutes: number;
  timerBreakMinutes: number;
  onboardingCompleted: boolean;
  [key: string]: string | number | boolean;
}

/* ------------------------------------------------------------------ */
/*  Collapsible accordion section                                      */
/* ------------------------------------------------------------------ */
function AccordionSection({
  icon,
  title,
  subtitle,
  defaultOpen = false,
  children,
  accentColor = "var(--teal)",
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  defaultOpen?: boolean;
  children: ReactNode;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper-strong)] overflow-hidden transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `color-mix(in srgb, ${accentColor} 15%, transparent)` }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[var(--ink)]">{title}</div>
          <div className="text-xs text-[var(--muted)] truncate">{subtitle}</div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-[var(--muted)]"
        >
          <ChevronDown className="size-4" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--line)] px-5 pb-5 pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reusable field helpers                                             */
/* ------------------------------------------------------------------ */
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
    <div className="space-y-1">
      <label className="block text-xs font-medium text-[var(--ink)]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field text-sm"
        placeholder={placeholder}
      />
    </div>
  );
}

function FieldTextarea({
  label,
  description,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-[var(--ink)]">{label}</label>
      {description && (
        <p className="text-[11px] text-[var(--muted)]">{description}</p>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-area text-sm"
        placeholder={placeholder}
        rows={3}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Settings Panel                                                */
/* ------------------------------------------------------------------ */
interface SettingsPanelProps {
  settings: SettingsForm;
  setSettings: React.Dispatch<React.SetStateAction<SettingsForm | null>>;
  onSave: () => void;
  aiKeyManager: ReactNode;
}

export function SettingsPanel({
  settings,
  setSettings,
  onSave,
  aiKeyManager,
}: SettingsPanelProps) {
  function update<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <div className="space-y-3">
      {/* ─── Section 1: Profile ─── */}
      <AccordionSection
        icon={<User className="size-4" style={{ color: "var(--teal)" }} />}
        title="Profile & Identity"
        subtitle="Role, education, and career targets"
        defaultOpen={true}
        accentColor="var(--teal)"
      >
        <div className="grid gap-4">
          <FieldTextarea
            label="Primary Goal"
            description="The overarching mission that drives your application matching and AI coaching."
            value={settings.primaryGoal}
            onChange={(v) => update("primaryGoal", v)}
            placeholder="e.g., Land a Software Engineer role at a top product startup"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <FieldInput
              label="Target Role"
              value={settings.targetRole}
              onChange={(v) => update("targetRole", v)}
              placeholder="Software Engineer"
            />
            <FieldInput
              label="Graduation Year"
              value={settings.graduationYear}
              onChange={(v) => update("graduationYear", v)}
              placeholder="2026"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FieldInput
              label="University"
              value={settings.university}
              onChange={(v) => update("university", v)}
              placeholder="University / college"
            />
            <FieldInput
              label="Degree / Program"
              value={settings.degree}
              onChange={(v) => update("degree", v)}
              placeholder="B.Tech CSE"
            />
          </div>

          <FieldTextarea
            label="Target Companies / Tracks"
            value={settings.targetCompanies}
            onChange={(v) => update("targetCompanies", v)}
            placeholder="Product startups, MAANG-style roles, backend-heavy teams..."
          />
        </div>
      </AccordionSection>

      {/* ─── Section 2: AI & Strategy ─── */}
      <AccordionSection
        icon={<Sparkles className="size-4" style={{ color: "#a78bfa" }} />}
        title="AI & Strategy"
        subtitle="Provider, model, coaching style, and weekly theme"
        accentColor="#a78bfa"
      >
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-[var(--ink)]">AI Provider</label>
              <select
                value={settings.aiProvider}
                onChange={(e) => {
                  const provider = e.target.value as AiProvider;
                  const modelMap: Record<AiProvider, string> = {
                    openai: "gpt-4o-mini",
                    gemini: "gemini-2.5-flash",
                    openrouter: "openai/gpt-4o-mini",
                  };
                  update("aiProvider", provider);
                  update("openAiModel", modelMap[provider]);
                }}
                className="field text-sm"
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>
            <FieldInput
              label="AI Model String"
              value={settings.openAiModel}
              onChange={(v) => update("openAiModel", v)}
              placeholder="gpt-4o-mini"
            />
          </div>

          <FieldTextarea
            label="Planning Style"
            value={settings.planStyle}
            onChange={(v) => update("planStyle", v)}
            placeholder="Strict weekday routine, balanced weekends, DSA first..."
          />

          <FieldInput
            label="Weekly Theme"
            value={settings.weeklyTheme}
            onChange={(v) => update("weeklyTheme", v)}
            placeholder="Graphs and backend systems, OA sprint, resume polish week"
          />

          <FieldTextarea
            label="Custom AI Instructions"
            value={settings.customAiInstructions}
            onChange={(v) => update("customAiInstructions", v)}
            placeholder="Tell the coach about weak topics, constraints, or feedback preferences"
          />

          {/* API keys card */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4">
            <div className="mb-2 text-xs font-semibold text-[var(--ink)]">Per-user API keys</div>
            <p className="mb-3 text-[11px] leading-5 text-[var(--muted)]">
              Keys are encrypted before storage and never returned to the browser.
            </p>
            {aiKeyManager}
          </div>
        </div>
      </AccordionSection>

      {/* ─── Section 3: Links ─── */}
      <AccordionSection
        icon={<Link2 className="size-4" style={{ color: "#38bdf8" }} />}
        title="Links & Trackers"
        subtitle="GitHub, LeetCode, LinkedIn, portfolio, and other profiles"
        accentColor="#38bdf8"
      >
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldInput
              label="Application Sheet URL"
              value={settings.sheetUrl}
              onChange={(v) => update("sheetUrl", v)}
              placeholder="Google Sheet / Airtable URL"
            />
            <FieldInput
              label="Google Apps Script URL"
              value={settings.googleAppsScriptUrl}
              onChange={(v) => update("googleAppsScriptUrl", v)}
              placeholder="Apps Script Endpoint"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <FieldInput
              label="Resume URL"
              value={settings.resumeUrl}
              onChange={(v) => update("resumeUrl", v)}
              placeholder="Drive / PDF link"
            />
            <FieldInput
              label="GitHub"
              value={settings.githubUrl}
              onChange={(v) => update("githubUrl", v)}
              placeholder="GitHub profile"
            />
            <FieldInput
              label="LeetCode"
              value={settings.leetcodeUrl}
              onChange={(v) => update("leetcodeUrl", v)}
              placeholder="LeetCode profile"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <FieldInput
              label="LinkedIn"
              value={settings.linkedinUrl}
              onChange={(v) => update("linkedinUrl", v)}
              placeholder="LinkedIn profile"
            />
            <FieldInput
              label="Portfolio"
              value={settings.portfolioUrl}
              onChange={(v) => update("portfolioUrl", v)}
              placeholder="Portfolio / personal site"
            />
            <FieldInput
              label="Job Tracker Board"
              value={settings.jobTrackerUrl}
              onChange={(v) => update("jobTrackerUrl", v)}
              placeholder="Notion / dashboard"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <FieldInput
              label="Codeforces"
              value={settings.codeforcesUrl}
              onChange={(v) => update("codeforcesUrl", v)}
              placeholder="Codeforces profile"
            />
            <FieldInput
              label="CodeChef"
              value={settings.codechefUrl}
              onChange={(v) => update("codechefUrl", v)}
              placeholder="CodeChef profile"
            />
            <FieldInput
              label="HackerRank"
              value={settings.hackerrankUrl}
              onChange={(v) => update("hackerrankUrl", v)}
              placeholder="HackerRank profile"
            />
          </div>
        </div>
      </AccordionSection>

      {/* ─── Section 4: Schedule & Targets ─── */}
      <AccordionSection
        icon={<Target className="size-4" style={{ color: "#f59e0b" }} />}
        title="Targets & Schedule"
        subtitle="Weekly goals, time blocks, and focus timer config"
        accentColor="#f59e0b"
      >
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <FieldInput
              label="Weekly DSA Target"
              type="number"
              value={settings.weeklyDsaTarget}
              onChange={(v) => update("weeklyDsaTarget", Number(v))}
            />
            <FieldInput
              label="Weekly Apps Target"
              type="number"
              value={settings.weeklyApplicationTarget}
              onChange={(v) => update("weeklyApplicationTarget", Number(v))}
            />
            <FieldInput
              label="Weekly Build Target"
              type="number"
              value={settings.weeklyBuildTarget}
              onChange={(v) => update("weeklyBuildTarget", Number(v))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FieldInput
              label="Weekday Task Target"
              type="number"
              value={settings.weekdayTaskTarget}
              onChange={(v) => update("weekdayTaskTarget", Number(v))}
            />
            <FieldInput
              label="Weekend Task Target"
              type="number"
              value={settings.weekendTaskTarget}
              onChange={(v) => update("weekendTaskTarget", Number(v))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FieldInput
              label="Weekend DSA Minutes"
              type="number"
              value={settings.weekendDsaMinutes}
              onChange={(v) => update("weekendDsaMinutes", Number(v))}
            />
            <FieldInput
              label="Weekend Build Minutes"
              type="number"
              value={settings.weekendBuildMinutes}
              onChange={(v) => update("weekendBuildMinutes", Number(v))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FieldInput
              label="Weekday Deep Work Minutes"
              type="number"
              value={settings.weekdayDeepWorkMinutes}
              onChange={(v) => update("weekdayDeepWorkMinutes", Number(v))}
            />
            <FieldInput
              label="Weekday Support Block Minutes"
              type="number"
              value={settings.weekdaySupportMinutes}
              onChange={(v) => update("weekdaySupportMinutes", Number(v))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FieldInput
              label="Focus Timer (min)"
              type="number"
              value={settings.timerFocusMinutes}
              onChange={(v) => update("timerFocusMinutes", Number(v))}
            />
            <FieldInput
              label="Break Timer (min)"
              type="number"
              value={settings.timerBreakMinutes}
              onChange={(v) => update("timerBreakMinutes", Number(v))}
            />
          </div>

          <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 px-4 py-3 text-xs text-amber-400">
            Weekend template reserves{" "}
            <strong>{settings.weekendDsaMinutes + settings.weekendBuildMinutes}</strong>{" "}
            focused minutes across DSA and project work.
          </div>
        </div>
      </AccordionSection>

      {/* ─── Save Button ─── */}
      <button
        onClick={onSave}
        className={cn(
          "w-full rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all",
          "bg-[var(--ink)] text-[var(--paper-strong)]",
          "hover:opacity-90 active:scale-[0.99]",
          "shadow-[0_2px_12px_rgba(0,0,0,0.15)]",
        )}
      >
        Save all settings
      </button>
    </div>
  );
}
