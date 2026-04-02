"use client";

import { KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";

import type { AiProvider, DashboardData } from "@/lib/types";
import { cn } from "@/lib/utils";

const providers: AiProvider[] = ["openai", "gemini", "openrouter"];

export function AiKeyManager({
  integrations,
  onSaveKey,
  onDeleteKey,
}: {
  integrations: DashboardData["integrations"];
  onSaveKey: (provider: AiProvider, apiKey: string) => Promise<void>;
  onDeleteKey: (provider: AiProvider) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<AiProvider, string>>({
    openai: "",
    gemini: "",
    openrouter: "",
  });

  return (
    <div className="grid gap-3">
      {providers.map((provider) => {
        const source = integrations.providerSources[provider];
        const hasSavedKey = integrations.savedApiKeys[provider];
        const available = integrations.providers[provider];

        return (
          <div key={provider} className="soft-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em]">
                  <KeyRound className="size-4 text-[var(--teal)]" />
                  {provider}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      available
                        ? "bg-[var(--teal-soft)] text-[var(--teal)]"
                        : "bg-white/8 text-[var(--muted)]",
                    )}
                  >
                    {available ? "Available" : "Not configured"}
                  </span>
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                    {source === "user"
                      ? "Using saved user key"
                      : source === "server"
                        ? "Using server fallback"
                        : "No key source"}
                  </span>
                  {hasSavedKey ? (
                    <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-300">
                      Stored securely
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)]">
                <ShieldCheck className="size-3.5 text-emerald-400" />
                Encrypted at rest
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="password"
                value={drafts[provider]}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [provider]: event.target.value,
                  }))
                }
                className="field flex-1"
                placeholder={`Paste ${provider} API key`}
              />
              <button
                onClick={() =>
                  void onSaveKey(provider, drafts[provider]).then(() => {
                    setDrafts((current) => ({ ...current, [provider]: "" }));
                  })
                }
                disabled={!drafts[provider].trim()}
                className={cn(
                  "rounded-full px-4 py-3 text-sm font-medium transition",
                  drafts[provider].trim()
                    ? "bg-[var(--ink)] text-[var(--paper-strong)]"
                    : "cursor-not-allowed bg-white/10 text-[var(--muted)]",
                )}
              >
                Save key
              </button>
              <button
                onClick={() => void onDeleteKey(provider)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] px-4 py-3 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--line)]"
              >
                <Trash2 className="size-4" />
                Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
