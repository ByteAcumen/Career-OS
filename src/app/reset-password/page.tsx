"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState, Suspense } from "react";
import { ArrowRight, CheckCircle2, KeyRound, Sparkles } from "lucide-react";

import { authClient } from "@/lib/auth-client";

/* ------------------------------------------------------------------ */
/*  Inner component (uses useSearchParams)                             */
/* ------------------------------------------------------------------ */
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Invalid or missing reset token. Please request a new link.");
      return;
    }

    setIsPending(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (result.error) throw new Error(result.error.message || "Reset failed.");
      setSuccess(true);
      setTimeout(() => router.push("/sign-in"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      setIsPending(false);
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/20">
          <CheckCircle2 className="size-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">Password reset!</h2>
        <p className="text-sm text-slate-400">
          Your password has been updated. Redirecting to sign in...
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 w-full">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-300">
          New password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-field"
          placeholder="At least 12 characters"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-300">
          Confirm password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="auth-field"
          placeholder="Re-enter your new password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <motion.button
        type="submit"
        disabled={isPending}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="relative flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(20,184,166,0.25)] transition-shadow hover:shadow-[0_6px_28px_rgba(20,184,166,0.35)] disabled:opacity-50"
      >
        {isPending ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <>
            Set new password
            <ArrowRight className="size-4" />
          </>
        )}
      </motion.button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030712] px-4 py-10 text-white">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(20,184,166,0.1),transparent)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.03] shadow-2xl backdrop-blur-xl">
          {/* Teal accent line */}
          <div className="h-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500" />

          <div className="p-8 sm:p-10">
            {/* Header */}
            <div className="mb-8 text-center">
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-teal-300/80">
                <Sparkles className="size-3" />
                Password Reset
              </span>
              <div className="mt-3 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 ring-1 ring-teal-400/20">
                  <KeyRound className="size-6 text-teal-400" />
                </div>
              </div>
              <h1 className="mt-4 text-xl font-bold text-white">
                Set a new password
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Enter your new password below to regain access to your workspace.
              </p>
            </div>

            <Suspense
              fallback={
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-400/30 border-t-teal-400" />
                </div>
              }
            >
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
