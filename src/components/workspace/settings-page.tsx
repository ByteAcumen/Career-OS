"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";

import { AccountSecurityPanel } from "@/components/account-security-panel";
import { AiKeyManager } from "@/components/ai-key-manager";
import { SettingsPanel } from "@/components/settings-panel";
import { useWorkspaceUi } from "@/components/workspace/workspace-shell";
import {
  ActionLink,
  InfoCard,
  PageHeader,
  SectionCard,
  StatCard,
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
    <motion.div variants={sectionStagger} initial="hidden" animate="show" className="grid gap-6">
      <motion.div variants={riseIn}>
        <PageHeader
          eyebrow="Settings"
          title="Keep customization, AI configuration, and security in one disciplined place."
          description="Settings owns profile details, links, planner defaults, AI integrations, and account protection so the rest of the workspace can stay focused."
          actions={
            <>
              <ActionLink href="/planner" label="Open planner" />
              <ActionLink href="/strategy" label="Open strategy" />
            </>
          }
        />
      </motion.div>

      <motion.div variants={riseIn} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Planner targets"
          value={`${settings.weekdayTaskTarget}/${settings.weekendTaskTarget}`}
          detail="Weekday and weekend task defaults."
        />
        <StatCard
          label="Weekly goals"
          value={
            settings.weeklyDsaTarget +
            settings.weeklyApplicationTarget +
            settings.weeklyBuildTarget
          }
          detail="Combined target checkpoints across DSA, apps, and builds."
        />
        <StatCard
          label="AI provider"
          value={settings.aiProvider}
          detail="Current active provider preference for AI features."
        />
        <StatCard
          label="Saved keys"
          value={Object.values(integrations.savedApiKeys).filter(Boolean).length}
          detail="Encrypted per-user AI credentials currently stored."
        />
      </motion.div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.06fr)_0.94fr]">
        <motion.div variants={riseIn} className="grid gap-6">
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

        <motion.div variants={riseIn} className="grid gap-6">
          <SectionCard
            eyebrow="Snapshot"
            title="Workspace snapshot"
            description="A compact summary of the settings that matter most to the rest of the product."
          >
            <div className="grid gap-3">
              <InfoCard
                label="Primary goal"
                value={settings.primaryGoal || "No primary goal saved yet."}
              />
              <InfoCard
                label="Weekly theme"
                value={settings.weeklyTheme || "No weekly theme saved yet."}
              />
              <InfoCard
                label="Plan style"
                value={settings.planStyle || "No planning style saved yet."}
              />
              <InfoCard
                label="Profile completeness"
                value={
                  settings.onboardingCompleted
                    ? "Core onboarding is complete."
                    : "Finish onboarding fields to improve personalization quality."
                }
              />
              <InfoCard
                label="Task rhythm"
                value={`${settings.weekdayTaskTarget} weekday tasks and ${settings.weekendTaskTarget} weekend tasks.`}
              />
              <InfoCard
                label="Planner load"
                value={`${initialData.plannerSummary.active} active tasks currently depend on these defaults.`}
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Safety"
            title="AI and account posture"
            description="Keep the account secure and the AI setup intentional."
          >
            <div className="grid gap-3">
              <InfoCard
                label="AI readiness"
                value={
                  initialData.integrations.aiReady
                    ? "At least one provider is configured and ready."
                    : "No active provider is ready yet. Add or fix a key to unlock AI features."
                }
              />
              <InfoCard
                label="Credential ownership"
                value="Stored AI keys are encrypted per user and stay scoped to this workspace."
              />
              <InfoCard
                label="Google Sheets"
                value={
                  initialData.integrations.googleSheetsReady
                    ? "Google Sheets sync is configured."
                    : "Google Sheets sync is not configured yet."
                }
              />
            </div>
          </SectionCard>

          <AccountSecurityPanel />
        </motion.div>
      </div>
    </motion.div>
  );
}
