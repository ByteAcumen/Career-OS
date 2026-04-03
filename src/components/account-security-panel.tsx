"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function AccountSecurityPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 12) {
      setMessage({
        type: "error",
        text: "Password must be at least 12 characters.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword,
          ...(currentPassword ? { currentPassword } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      setMessage({ type: "success", text: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-card rounded-[32px] p-6 sm:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          <KeyRound className="size-3.5" />
          Account Security
        </div>
        <h3 className="mt-2 text-lg font-semibold text-[var(--ink)]">
          Password management
        </h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Set or change your password. OAuth users can add a password to enable email sign-in.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] px-4 py-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--teal)]" />
            <p className="text-sm leading-7 text-[var(--muted)]">
              If you signed in with{" "}
              <strong className="text-[var(--ink)]">Google</strong>, leave the
              &ldquo;Current password&rdquo; field empty and set a new password below.
              This lets you also sign in with email and password in the future.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--ink)]">
            Current password{" "}
            <span className="text-[var(--muted)]">(leave empty for OAuth accounts)</span>
          </label>
          <div className="relative">
            <input
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="field pr-10"
              placeholder="Leave blank if signed in via Google"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPasswords((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] transition"
              aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
            >
              {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--ink)]">
            New password
          </label>
          <input
            type={showPasswords ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="field"
            placeholder="At least 12 characters"
            autoComplete="new-password"
            minLength={12}
            required
          />
          {/* Inline strength hint */}
          {newPassword && (
            <div className="mt-1.5 flex gap-1">
              {[0, 1, 2, 3].map((i) => {
                let score = 0;
                if (newPassword.length >= 8) score++;
                if (newPassword.length >= 12) score++;
                if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) score++;
                if (/\d/.test(newPassword)) score++;
                if (/[^a-zA-Z0-9]/.test(newPassword)) score++;
                score = Math.min(score, 4);
                const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6"];
                return (
                  <div
                    key={i}
                    className="h-1.5 flex-1 rounded-full transition-colors"
                    style={{
                      backgroundColor: i <= score - 1 ? colors[score - 1] : "rgba(255,255,255,0.08)",
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--ink)]">
            Confirm new password
          </label>
          <input
            type={showPasswords ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="field"
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            minLength={12}
            required
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="mt-1 text-xs text-rose-400">Passwords do not match.</p>
          )}
        </div>

        {message && (
          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-sm",
              message.type === "error"
                ? "border border-rose-400/20 bg-rose-500/10 text-rose-200"
                : "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
            )}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !newPassword || !confirmPassword}
          className={cn(
            "rounded-full px-4 py-3 text-sm font-medium transition",
            saving || !newPassword || !confirmPassword
              ? "cursor-not-allowed bg-slate-700 text-slate-400"
              : "bg-[var(--ink)] text-[var(--paper-strong)] hover:opacity-90",
          )}
        >
          {saving ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
