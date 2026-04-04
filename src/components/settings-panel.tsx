"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Link2,
  ShieldCheck,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types - keep in sync with tracker-dashboard                        */
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
    <div className="glass-card group overflow-hidden rounded-[28px] border border-white/10 transition-all duration-300 hover:border-teal-500/30 hover:shadow-[var(--shadow-float)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-white/[0.035]"
      >
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-[18px] shadow-sm ring-1 ring-white/10 transition-transform group-hover:scale-110"
          style={{ 
            background: `linear-gradient(135deg, color-mix(in srgb, ${accentColor} 20%, transparent), color-mix(in srgb, ${accentColor} 5%, transparent))`,
          }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-[var(--ink)] tracking-tight">{title}</div>
          <div className="mt-0.5 text-xs text-[var(--muted)] line-clamp-1">{subtitle}</div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="shrink-0 rounded-full bg-white/7 p-1.5 text-[var(--muted)]"
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
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--line)] bg-black/12 px-6 pb-6 pt-5">
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
    <div className="group/field space-y-2">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] transition-colors group-focus-within/field:text-teal-400">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field h-11 w-full bg-[var(--card)] text-[14px] transition-all hover:border-[var(--muted)] focus:ring-1 focus:ring-teal-400/20"
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
    <div className="group/field space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] transition-colors group-focus-within/field:text-teal-400">
          {label}
        </label>
        {description && (
          <span className="text-[10px] text-[var(--muted)]/60 italic">{description}</span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-area min-h-[90px] w-full bg-[var(--card)] text-[14px] leading-relaxed transition-all hover:border-[var(--muted)] focus:ring-1 focus:ring-teal-400/20"
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
    <div className="grid gap-5">
      <div className="glass-card rounded-[30px] px-6 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-200">
              <Sparkles className="size-3.5" />
              Workspace tuning
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">Account Settings</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Shape how Career OS plans your week, interprets your progress, and
                presents your student profile across the app.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="soft-card rounded-[22px] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Targets</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {settings.weeklyDsaTarget + settings.weeklyApplicationTarget + settings.weeklyBuildTarget} weekly checkpoints
              </p>
            </div>
            <div className="soft-card rounded-[22px] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Planner rhythm</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {settings.weekdayTaskTarget} weekday / {settings.weekendTaskTarget} weekend tasks
              </p>
            </div>
            <div className="soft-card rounded-[22px] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Focus timer</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {settings.timerFocusMinutes}m focus + {settings.timerBreakMinutes}m break
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Section 1: Profile */}
        <AccordionSection
          icon={<User className="size-5" style={{ color: "var(--teal)" }} />}
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

      {/* Section 2: AI & Strategy */}
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
          <div className="mt-2 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-inner">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="size-4 text-emerald-400" />
              <div className="text-xs font-bold uppercase tracking-widest text-[var(--ink)]">Per-user API keys</div>
            </div>
            <p className="mb-4 text-[11px] leading-5 text-[var(--muted)]">
              Keys are encrypted before storage and never returned to the browser. Only your workspace uses them.
            </p>
            {aiKeyManager}
          </div>
        </div>
      </AccordionSection>

      {/* Section 3: Links */}
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

      {/* Section 4: Schedule & Targets */}
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

      {/* Save Button */}
      <button
        onClick={onSave}
        className={cn(
          "w-full rounded-[24px] px-5 py-4 text-sm font-semibold transition-all",
          "bg-[linear-gradient(120deg,#5eead4,#f8fafc,#fde68a)] text-slate-950",
          "hover:shadow-[0_18px_34px_rgba(94,234,212,0.2)] active:scale-[0.99]",
          "shadow-[0_12px_28px_rgba(15,23,42,0.16)]",
        )}
      >
        Save all settings
      </button>
    </div>
  </div>
);
}
