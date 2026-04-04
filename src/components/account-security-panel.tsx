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
    <div className="glass-card group overflow-hidden rounded-[30px] border border-white/10 transition-all duration-300 hover:border-teal-500/30 hover:shadow-[var(--shadow-float)]">
      <div className="flex w-full items-center gap-4 border-b border-[var(--line)] bg-white/5 px-6 py-5">
        <div className="flex size-11 items-center justify-center rounded-[18px] bg-teal-500/12 shadow-sm ring-1 ring-white/10 transition-transform group-hover:scale-110">
          <KeyRound className="size-5 text-teal-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold tracking-tight text-[var(--ink)]">Account Security</div>
          <div className="mt-0.5 text-xs text-[var(--muted)]">Password management and secure sign-in</div>
        </div>
      </div>

      <div className="space-y-6 px-6 py-6">
        <div className="soft-card rounded-[24px] border border-white/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-400" />
            <p className="text-[13px] leading-relaxed text-[var(--muted)]">
              If you signed in with{" "}
              <strong className="text-[var(--ink)]">Google</strong>, leave the
              &ldquo;Current password&rdquo; field empty and set a new password below.
              This lets you also sign in with email and password in the future.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5">

        <div className="group/field space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] transition-colors group-focus-within/field:text-teal-400">
            Current password{" "}
            <span className="text-[10px] lowercase italic opacity-60">(leave empty for OAuth)</span>
          </label>
          <div className="relative">
            <input
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="field h-11 w-full bg-[var(--card)] pr-10 text-[14px] transition-all hover:border-[var(--muted)] focus:ring-1 focus:ring-teal-400/20"
              placeholder="************"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPasswords((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-white transition"
              aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
            >
              {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="group/field space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] transition-colors group-focus-within/field:text-teal-400">
            New password
          </label>
          <input
            type={showPasswords ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="field h-11 w-full bg-[var(--card)] text-[14px] transition-all hover:border-[var(--muted)] focus:ring-1 focus:ring-teal-400/20"
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

        <div className="group/field space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] transition-colors group-focus-within/field:text-teal-400">
            Confirm new password
          </label>
          <input
            type={showPasswords ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="field h-11 w-full bg-[var(--card)] text-[14px] transition-all hover:border-[var(--muted)] focus:ring-1 focus:ring-teal-400/20"
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            minLength={12}
            required
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="mt-1 text-[11px] font-medium text-rose-400">Passwords do not match.</p>
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
            "mt-2 w-full rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all shadow-lg",
            saving || !newPassword || !confirmPassword
              ? "cursor-not-allowed bg-white/5 text-white/20"
              : "bg-[linear-gradient(120deg,#7dd3fc,#f8fafc,#fde68a)] text-slate-950 hover:shadow-[0_16px_32px_rgba(125,211,252,0.22)] active:scale-[0.99]",
          )}
        >
          {saving ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  </div>
);
}
