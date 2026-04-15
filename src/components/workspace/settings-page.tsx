"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";

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
