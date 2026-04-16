"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, RefreshCcw, Send } from "lucide-react";

import { AccountSecurityPanel } from "@/components/account-security-panel";
import { AiKeyManager } from "@/components/ai-key-manager";
import { SettingsPanel } from "@/components/settings-panel";
import { useWorkspaceUi } from "@/components/workspace/workspace-shell";
import {
  ActionLink,
  riseIn,
  sectionStagger,
} from "@/components/workspace/workspace-primitives";
import { postJson } from "@/lib/client-request";
import type { SettingsPageData } from "@/lib/workspace-data";
import type { AiProvider, WorkspaceSettings } from "@/lib/types";

export function WorkspaceSettingsPage({
  data: initialData,
}: {
  data: SettingsPageData;
}) {
  const { setToast } = useWorkspaceUi();
  const [settings, setSettings] = useState<WorkspaceSettings>(initialData.settings);
  const [integrations, setIntegrations] = useState(initialData.integrations);
  const [, startTransition] = useTransition();

  // Digest state
  type DigestPreview = {
    subject: string; headline: string; greeting: string;
    metrics: { label: string; value: string; context: string }[];
    wins: string[]; risks: string[]; nextWeek: string[];
    recentWork: { title: string; detail: string; type: string }[];
  };
  const [digestPreview, setDigestPreview] = useState<DigestPreview | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestSending, setDigestSending] = useState(false);

  async function saveSettings() {
    try {
      await postJson("/api/settings", settings);
      setToast("Settings saved.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not save settings.");
    }
  }

  async function saveAiKey(provider: AiProvider, apiKey: string) {
    try {
      await postJson("/api/settings/ai-keys", { provider, apiKey });
      setIntegrations((current) => ({
        ...current,
        providers: { ...current.providers, [provider]: true },
        providerSources: { ...current.providerSources, [provider]: "user" },
        savedApiKeys: { ...current.savedApiKeys, [provider]: true },
      }));
      setToast(`${provider} key saved securely.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not save the API key.");
    }
  }

  async function removeAiKey(provider: AiProvider) {
    try {
      await postJson("/api/settings/ai-keys", { provider }, { method: "DELETE" });
      setIntegrations((current) => ({
        ...current,
        providerSources: {
          ...current.providerSources,
          [provider]: current.providers[provider] ? "server" : "none",
        },
        savedApiKeys: { ...current.savedApiKeys, [provider]: false },
      }));
      setToast(`${provider} key removed.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not remove the API key.");
    }
  }

  async function previewDigest() {
    setDigestLoading(true);
    try {
      const res = await fetch("/api/ai/digest");
      if (!res.ok) throw new Error("Could not load digest preview.");
      const payload = (await res.json()) as { digest: DigestPreview };
      setDigestPreview(payload.digest);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Digest preview failed.");
    } finally {
      setDigestLoading(false);
    }
  }

  async function sendDigest() {
    setDigestSending(true);
    try {
      const res = await fetch("/api/ai/digest", { method: "POST" });
      const payload = (await res.json()) as { ok: boolean; deliveredTo?: string; message?: string };
      if (!payload.ok) throw new Error(payload.message ?? "Failed to send digest.");
      setToast(`Digest sent to ${payload.deliveredTo ?? "your email"}.`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not send digest.");
    } finally {
      setDigestSending(false);
    }
  }

  return (
    <motion.div variants={sectionStagger} initial="hidden" animate="show" className="grid gap-5">
      <motion.section variants={riseIn} className="glass-card rounded-[30px] p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="page-pill">Settings</div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
              Workspace preferences
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Keep profile data, links, planner defaults, AI keys, and account protection in one
              clean place without mixing them into the daily workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ActionLink href="/planner" label="Open planner" />
            <ActionLink href="/strategy" label="Open strategy" />
            <button
              type="button"
              onClick={() => startTransition(() => void saveSettings())}
              className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-neutral-200 active:scale-[0.99]"
            >
              Save settings
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewItem
            label="Planner rhythm"
            value={`${settings.weekdayTaskTarget}/${settings.weekendTaskTarget}`}
            detail="Weekday / weekend task targets"
          />
          <OverviewItem
            label="Weekly goals"
            value={settings.weeklyDsaTarget + settings.weeklyApplicationTarget + settings.weeklyBuildTarget}
            detail="DSA, applications, and builds"
          />
          <OverviewItem
            label="AI provider"
            value={settings.aiProvider}
            detail={initialData.integrations.aiReady ? "Provider ready" : "Needs a valid key"}
          />
          <OverviewItem
            label="Saved keys"
            value={Object.values(integrations.savedApiKeys).filter(Boolean).length}
            detail="Encrypted per-user credentials"
          />
        </div>
      </motion.section>

      <motion.div variants={riseIn}>
        <SettingsPanel
          settings={settings}
          setSettings={setSettings}
          onSave={() => startTransition(() => void saveSettings())}
          aiKeyManager={
            <AiKeyManager
              integrations={integrations}
              onSaveKey={saveAiKey}
              onDeleteKey={removeAiKey}
            />
          }
        />
      </motion.div>

      <motion.div variants={riseIn}>
        <AccountSecurityPanel />
      </motion.div>

      {/* ── Weekly Digest ── */}
      <motion.div variants={riseIn}>
        <section className="glass-card section-panel rounded-[28px] p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Digest</div>
              <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">Weekly email digest</h2>
              <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
                Preview your personalized weekly summary — wins, risks, next-week plan, and recent work — then send it straight to your inbox.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void previewDigest()}
                disabled={digestLoading}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/6 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCcw className={`size-4 ${digestLoading ? "animate-spin" : ""}`} />
                Preview
              </button>
              <button
                type="button"
                onClick={() => void sendDigest()}
                disabled={digestSending || !digestPreview}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-40"
              >
                {digestSending ? <Mail className="size-4 animate-pulse" /> : <Send className="size-4" />}
                Send to inbox
              </button>
            </div>
          </div>

          <AnimatePresence>
            {digestPreview ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Subject line */}
                <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Subject</span>
                  <p className="mt-1 text-sm font-semibold text-white">{digestPreview.subject}</p>
                </div>

                {/* Metrics grid */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {digestPreview.metrics.map((m) => (
                    <div key={m.label} className="metric-panel">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{m.label}</div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{m.value}</div>
                      <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{m.context}</div>
                    </div>
                  ))}
                </div>

                {/* Wins / Risks */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="soft-card space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Wins</div>
                    <ul className="space-y-1.5">
                      {digestPreview.wins.map((w, i) => (
                        <li key={i} className="flex gap-2 text-sm leading-6 text-white/80">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-green-400/70" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="soft-card space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Risks</div>
                    <ul className="space-y-1.5">
                      {digestPreview.risks.map((r, i) => (
                        <li key={i} className="flex gap-2 text-sm leading-6 text-white/80">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-400/70" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Next week */}
                <div className="soft-card space-y-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Next week</div>
                  <ul className="space-y-1.5">
                    {digestPreview.nextWeek.map((n, i) => (
                      <li key={i} className="flex gap-2 text-sm leading-6 text-white/80">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-white/40" />
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recent work */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {digestPreview.recentWork.map((item, i) => (
                    <div key={i} className="soft-card">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{item.type}</div>
                      <div className="mt-2 text-sm font-semibold text-white">{item.title}</div>
                      <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.detail}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="rounded-[22px] border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-5 text-sm text-[var(--muted)]">
                Click &ldquo;Preview&rdquo; to generate your weekly summary before sending.
              </div>
            )}
          </AnimatePresence>
        </section>
      </motion.div>
    </motion.div>
  );
}

function OverviewItem({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-white/[0.025] px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-2 truncate text-2xl font-semibold tracking-[-0.04em] text-white">
        {value}
      </div>
      <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</div>
    </div>
  );
}
