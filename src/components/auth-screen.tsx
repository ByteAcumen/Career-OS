"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChangeEvent, FormEvent, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  Workflow,
  Zap,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { PasswordStrength } from "@/components/ui/PasswordStrength";

type AuthMode = "sign-in" | "sign-up";

/* ------------------------------------------------------------------ */
/*  Animated background orbs (with will-change for GPU compositing)    */
/* ------------------------------------------------------------------ */
function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 70%)",
          willChange: "transform",
        }}
        animate={{ x: [0, 30, -20, 0], y: [0, -25, 15, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)",
          willChange: "transform",
        }}
        animate={{ x: [0, -20, 25, 0], y: [0, 20, -15, 0] }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)",
          willChange: "transform",
        }}
        animate={{ scale: [1, 1.15, 0.95, 1] }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Google icon SVG                                                   */
/* ------------------------------------------------------------------ */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature pill cards on left side                                   */
/* ------------------------------------------------------------------ */
const features = [
  {
    icon: ShieldCheck,
    title: "Protected sessions",
    body: "HTTP‑only cookies, CSRF tokens & rate‑limiting keep your account safe.",
    gradient: "from-teal-500/20 to-teal-500/5",
  },
  {
    icon: LockKeyhole,
    title: "Isolated data",
    body: "Each account gets its own snapshots, builds, and applications.",
    gradient: "from-amber-500/20 to-amber-500/5",
  },
  {
    icon: Workflow,
    title: "Built to scale",
    body: "Migration‑ready storage, auth routes, and a structured service layer.",
    gradient: "from-violet-500/20 to-violet-500/5",
  },
];

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 260, damping: 24 },
  },
};

/* ------------------------------------------------------------------ */
/*  Main AuthScreen component                                         */
/* ------------------------------------------------------------------ */
export function AuthScreen({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const isSignup = mode === "sign-up";

  const [isPending, setIsPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  /* Forgot password state */
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPending, setForgotPending] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState("");

  /* ---- email / password submit ---- */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError("");
    try {
      if (isSignup) {
        const result = await authClient.signUp.email({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        });
        if (result.error) throw new Error(result.error.message || "Sign‑up failed.");
      } else {
        const result = await authClient.signIn.email({
          email: form.email.trim(),
          password: form.password,
        });
        if (result.error) throw new Error(result.error.message || "Sign‑in failed.");
      }
      router.push("/home");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setIsPending(false);
    }
  }

  /* ---- Google OAuth ---- */
  async function handleGoogleSignIn() {
    setGooglePending(true);
    setError("");
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/home",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign‑in failed.");
      setGooglePending(false);
    }
  }

  /* ---- Forgot Password ---- */
  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    setForgotPending(true);
    setForgotError("");
    try {
      const res = await fetch("/api/auth/forget-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          redirectTo: window.location.origin + "/reset-password",
        }),
      });
      
      const result = await res.json().catch(() => ({}));
      
      if (!res.ok || result.error) {
        throw new Error(result.error?.message || result.message || "Request failed.");
      }
      
      setForgotSuccess(true);
    } catch (err) {
      setForgotError(
        err instanceof Error ? err.message : "Could not send reset email.",
      );
    } finally {
      setForgotPending(false);
    }
  }

  /* ---- helpers ---- */
  function updateField(field: keyof typeof form) {
    return (e: ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030712] px-4 py-10 text-white sm:px-6 lg:px-8">
      <FloatingOrbs />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(20,184,166,0.12),transparent)]" />

      {/* Two‑column layout */}
      <div className="relative z-10 mx-auto grid w-full max-w-[1120px] items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">

        {/* ---- LEFT SIDE — branding & features ---- */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          <motion.div variants={childVariants}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.25em] text-teal-300/90 shadow-[0_0_24px_rgba(20,184,166,0.08)] backdrop-blur-xl">
              <Sparkles className="size-3.5" />
              Career OS · Secure Edition
            </span>
          </motion.div>

          <motion.div variants={childVariants} className="max-w-lg space-y-5">
            <h1 className="text-[2.75rem] font-bold leading-[1.08] tracking-tight sm:text-[3.25rem]">
              <span className="bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Your private career
              </span>
              <br />
              <span className="bg-gradient-to-r from-teal-300 via-emerald-300 to-amber-300 bg-clip-text text-transparent">
                command centre.
              </span>
            </h1>
            <p className="max-w-md text-[15px] leading-7 text-slate-400">
              Track applications, solve DSA, ship projects, and let AI plan your
              day — all inside a secure, private workspace.
            </p>
          </motion.div>

          <motion.div
            variants={childVariants}
            className="grid gap-3 sm:grid-cols-3"
          >
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 backdrop-blur-xl transition-colors hover:border-white/[0.12] hover:bg-white/[0.05]"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 transition-opacity group-hover:opacity-100`}
                  />
                  <div className="relative">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
                      <Icon className="size-[18px] text-teal-300" />
                    </div>
                    <h3 className="text-sm font-semibold text-white/90">
                      {f.title}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-[1.55] text-slate-400">
                      {f.body}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            variants={childVariants}
            className="flex items-center gap-3 text-xs text-slate-500"
          >
            <Fingerprint className="size-4 text-slate-600" />
            <span>
              End‑to‑end encrypted cookies · PKCE OAuth · Rate‑limited API
            </span>
          </motion.div>
        </motion.section>

        {/* ---- RIGHT SIDE — auth card ---- */}
        <motion.section
          initial={{ opacity: 0, scale: 0.95, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.18, type: "spring", stiffness: 200, damping: 22 }}
          className="relative"
        >
          <div className="pointer-events-none absolute -inset-4 rounded-[40px] bg-gradient-to-br from-teal-500/10 via-transparent to-amber-500/10 blur-2xl" />

          <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[rgba(8,12,20,0.75)] shadow-[0_24px_80px_-16px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl">
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />

            <div className="px-7 pb-8 pt-7 sm:px-9 sm:pb-10 sm:pt-9">
              <AnimatePresence mode="wait">
                {/* ─── FORGOT PASSWORD VIEW ─── */}
                {showForgotPassword ? (
                  <motion.div
                    key="forgot"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  >
                    <button
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotSuccess(false);
                        setForgotError("");
                      }}
                      className="mb-5 flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-teal-400"
                    >
                      <ArrowLeft className="size-3.5" />
                      Back to sign in
                    </button>

                    <div className="mb-6 space-y-2">
                      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
                        <LockKeyhole className="size-3 text-teal-400" />
                        Password Recovery
                      </div>
                      <h2 className="text-[1.65rem] font-bold tracking-tight text-white">
                        Reset your password
                      </h2>
                      <p className="text-sm text-slate-400">
                        Enter your email and we&apos;ll send a secure link to reset your password.
                      </p>
                    </div>

                    {forgotSuccess ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-6 py-8 text-center"
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/20">
                          <CheckCircle2 className="size-7 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-emerald-300">
                            Reset link sent!
                          </h3>
                          <p className="mt-1 text-xs text-slate-400">
                            Check your inbox at <strong className="text-white">{forgotEmail}</strong> for the reset link.
                            It expires in 1 hour.
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <label className="block">
                          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <Mail className="size-3" />
                            Email address
                          </span>
                          <input
                            type="email"
                            required
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                            className="auth-field"
                          />
                        </label>

                        <AnimatePresence>
                          {forgotError && (
                            <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                            >
                              {forgotError}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <motion.button
                          type="submit"
                          disabled={forgotPending}
                          whileHover={{ scale: 1.015 }}
                          whileTap={{ scale: 0.975 }}
                          className="group relative w-full overflow-hidden rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(20,184,166,0.2)] transition-shadow hover:shadow-[0_0_32px_rgba(20,184,166,0.35)] disabled:opacity-60"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300" />
                          <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
                          <span className="relative flex items-center justify-center gap-2">
                            {forgotPending ? (
                              <>
                                <motion.div
                                  className="size-4 rounded-full border-2 border-slate-900/30 border-t-slate-900"
                                  animate={{ rotate: 360 }}
                                  transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                                />
                                Sending reset link…
                              </>
                            ) : (
                              <>
                                Send reset link
                                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                              </>
                            )}
                          </span>
                        </motion.button>
                      </form>
                    )}
                  </motion.div>
                ) : (
                  /* ─── MAIN SIGN-IN / SIGN-UP VIEW ─── */
                  <motion.div
                    key="main-auth"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  >
                    {/* Header */}
                    <div className="mb-7 space-y-2">
                      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
                        <Zap className="size-3 text-teal-400" />
                        {isSignup ? "Get started" : "Welcome back"}
                      </div>
                      <h2 className="text-[1.65rem] font-bold tracking-tight text-white">
                        {isSignup
                          ? "Create your workspace"
                          : "Sign in to your dashboard"}
                      </h2>
                    </div>

                    {/* Google OAuth */}
                    <motion.button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={googlePending}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                      className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-white transition-all hover:border-white/20 hover:bg-white/[0.07] disabled:opacity-50"
                    >
                      <GoogleIcon className="size-5" />
                      {googlePending ? (
                        <span className="animate-pulse">Redirecting to Google…</span>
                      ) : (
                        <>
                          Continue with Google
                          <ArrowRight className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </motion.button>

                    {/* Divider */}
                    <div className="my-6 flex items-center gap-4">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
                        or continue with email
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                    </div>

                    {/* Form */}
                    <form className="space-y-4" onSubmit={handleSubmit}>
                      <AnimatePresence mode="popLayout">
                        {isSignup && (
                          <motion.div
                            key="name-field"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 28 }}
                          >
                            <label className="block">
                              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                                <User className="size-3" />
                                Full name
                              </span>
                              <input
                                required
                                value={form.name}
                                onChange={updateField("name")}
                                placeholder="Your name"
                                autoComplete="name"
                                aria-label="Full name"
                                className="auth-field"
                              />
                            </label>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Email */}
                      <div>
                        <label className="block">
                          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <Mail className="size-3" />
                            Email address
                          </span>
                          <input
                            type="email"
                            required
                            value={form.email}
                            onChange={updateField("email")}
                            placeholder="you@example.com"
                            autoComplete="email"
                            aria-label="Email address"
                            className="auth-field"
                          />
                        </label>
                      </div>

                      {/* Password */}
                      <div>
                        <label className="block">
                          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <LockKeyhole className="size-3" />
                            Password
                          </span>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              minLength={12}
                              value={form.password}
                              onChange={updateField("password")}
                              placeholder="At least 12 characters"
                              autoComplete={isSignup ? "new-password" : "current-password"}
                              aria-label="Password"
                              className="auth-field pr-11"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition-colors hover:text-slate-300"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? (
                                <EyeOff className="size-4" />
                              ) : (
                                <Eye className="size-4" />
                              )}
                            </button>
                          </div>
                        </label>

                        {isSignup && <PasswordStrength password={form.password} />}

                        {/* Forgot password link (sign-in only) */}
                        {!isSignup && (
                          <div className="mt-2 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setShowForgotPassword(true);
                                setForgotEmail(form.email);
                              }}
                              className="text-xs font-medium text-teal-400/80 transition-colors hover:text-teal-300"
                            >
                              Forgot password?
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Error */}
                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                          >
                            {error}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Submit */}
                      <motion.button
                        type="submit"
                        disabled={isPending}
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.975 }}
                        className="group relative w-full overflow-hidden rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(20,184,166,0.2)] transition-shadow hover:shadow-[0_0_32px_rgba(20,184,166,0.35)] disabled:opacity-60"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300" />
                        <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
                        <span className="relative flex items-center justify-center gap-2">
                          {isPending ? (
                            <>
                              <motion.div
                                className="size-4 rounded-full border-2 border-slate-900/30 border-t-slate-900"
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                              />
                              Securing session…
                            </>
                          ) : (
                            <>
                              {isSignup ? "Create secure account" : "Sign in"}
                              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                            </>
                          )}
                        </span>
                      </motion.button>
                    </form>

                    {/* Toggle link */}
                    <div className="mt-7 text-center text-sm text-slate-500">
                      {isSignup
                        ? "Already have an account? "
                        : "Don't have an account? "}
                      <Link
                        href={isSignup ? "/sign-in" : "/sign-up"}
                        className="font-semibold text-teal-400 transition-colors hover:text-teal-300"
                      >
                        {isSignup ? "Sign in" : "Create one"}
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
