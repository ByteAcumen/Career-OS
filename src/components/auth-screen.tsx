"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { type ChangeEvent, type FormEvent, useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Target,
  User,
  Loader2,
} from "lucide-react";

import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

const fadeIn = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function AuthScreen({ mode, googleEnabled = true }: { mode: AuthMode; googleEnabled?: boolean }) {
  const router = useRouter();
  const isSignup = mode === "sign-up";

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [error, setError] = useState("");
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPending, setForgotPending] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [verificationState, setVerificationState] = useState<{ email: string; reason: "signup" | "signin" } | null>(null);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");

  function updateField(field: keyof typeof form) {
    return (e: ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function needsVerification(message: string) {
    const n = message.toLowerCase();
    return n.includes("verify") || n.includes("not verified");
  }

  async function resendVerificationLink(email: string) {
    setVerificationPending(true);
    setVerificationMessage("");
    try {
      const res = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, callbackURL: "/home" }),
      });
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(payload?.message || "Could not send the verification email.");
      setVerificationMessage(`Verification link sent to ${email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send verification email.");
    } finally {
      setVerificationPending(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    setVerificationMessage("");
    try {
      const email = form.email.trim().toLowerCase();
      if (isSignup) {
        const result = await authClient.signUp.email({
          name: form.name.trim(),
          email,
          password: form.password,
          callbackURL: "/home",
        });
        if (result.error) throw new Error(result.error.message || "Sign-up failed.");
        setVerificationState({ email, reason: "signup" });
        return;
      }
      const result = await authClient.signIn.email({
        email,
        password: form.password,
        callbackURL: "/home",
      });
      if (result.error) throw new Error(result.error.message || "Sign-in failed.");
      router.replace("/home");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed.";
      if (!isSignup && needsVerification(message)) {
        setVerificationState({ email: form.email.trim().toLowerCase(), reason: "signin" });
        return;
      }
      setError(message);
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    if (!googleEnabled) {
      setError("Google sign-in is unavailable right now.");
      return;
    }

    setGooglePending(true);
    setError("");
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/home",
      });
      // Redirect happens automatically; if still here, we clear loading after a moment
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
      setGooglePending(false);
    }
  }

  async function handleForgotPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setForgotPending(true);
    setError("");
    setForgotMessage("");
    try {
      const email = forgotEmail.trim();
      const { error: resetError } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
      if (resetError) throw new Error(resetError.message || "Could not send reset email.");
      setForgotMessage(`Reset link sent to ${email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setForgotPending(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--paper)] px-4 py-12 sm:px-6">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-white/[0.02] blur-[100px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-[420px] flex-col gap-6">
        {/* Logo link */}
        <div className="flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-full border border-[var(--line)] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition-colors hover:border-[var(--line-strong)] hover:bg-white/[0.07]"
          >
            <div className="flex size-7 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.06]">
              <Target className="size-3.5 text-white" />
            </div>
            Career OS
          </Link>
        </div>

        {/* Card */}
        <motion.div
          key="auth-card"
          variants={fadeIn}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[#0a0a0a] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.95)]"
        >
          <div className="px-7 py-8">
            <AnimatePresence mode="wait" initial={false}>
              {/* ── Forgot password ── */}
              {forgotVisible ? (
                <motion.div key="forgot" variants={fadeIn} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.22 }} className="flex flex-col gap-5">
                  <BackButton onClick={() => { setForgotVisible(false); setForgotMessage(""); setError(""); }} />
                  <div>
                    <div className="page-pill w-fit">Reset password</div>
                    <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
                      Send a secure reset link.
                    </h1>
                    <p className="mt-2.5 text-sm leading-[1.8] text-[var(--muted)]">
                      Enter the email address attached to your account.
                    </p>
                  </div>
                  <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                    <Field label="Email address" icon={Mail}>
                      <input
                        id="forgot-email"
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="auth-field"
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </Field>
                    {forgotMessage && <Banner variant="success">{forgotMessage}</Banner>}
                    {error && <Banner variant="error">{error}</Banner>}
                    <SubmitButton pending={forgotPending} label="Send reset link" pendingLabel="Sending…" />
                  </form>
                </motion.div>
              ) : verificationState ? (
                /* ── Email verification ── */
                <motion.div key="verify" variants={fadeIn} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.22 }} className="flex flex-col gap-5">
                  <BackButton onClick={() => { setVerificationState(null); setVerificationMessage(""); setError(""); }} />
                  <div>
                    <div className="page-pill w-fit">Verify email</div>
                    <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
                      Check your inbox to continue.
                    </h1>
                    <p className="mt-2.5 text-sm leading-[1.8] text-[var(--muted)]">
                      {verificationState.reason === "signup"
                        ? "Your workspace is protected behind email verification."
                        : "This account needs email verification before sign-in can continue."}
                    </p>
                  </div>
                  <Banner variant="info">
                    Verification email sent to <strong>{verificationState.email}</strong>.
                  </Banner>
                  {verificationMessage && <Banner variant="success">{verificationMessage}</Banner>}
                  {error && <Banner variant="error">{error}</Banner>}
                  <div className="flex flex-col gap-2.5">
                    <SubmitButton
                      pending={verificationPending}
                      label="Resend verification email"
                      pendingLabel="Sending…"
                      onClick={() => void resendVerificationLink(verificationState.email)}
                      type="button"
                    />
                    <button
                      type="button"
                      onClick={() => { setVerificationState(null); setVerificationMessage(""); setError(""); }}
                      className="auth-btn-secondary"
                    >
                      Return to sign in
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* ── Sign in / Sign up ── */
                <motion.div key="main" variants={fadeIn} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.22 }} className="flex flex-col gap-6">
                  <div>
                    <div className="page-pill w-fit">{isSignup ? "Create account" : "Sign in"}</div>
                    <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
                      {isSignup ? "Create your private workspace." : "Sign in to your workspace."}
                    </h1>
                    <p className="mt-2.5 text-sm leading-[1.8] text-[var(--muted)]">
                      {isSignup
                        ? "Set up Career OS with secure sessions, private data, and clean planning tools."
                        : "Continue with the same workspace, strategy, and progress tracking you already saved."}
                    </p>
                  </div>

                  {googleEnabled ? (
                    <>
                      {/* Google OAuth */}
                      <button
                        id="google-auth-btn"
                        type="button"
                        onClick={handleGoogle}
                        disabled={googlePending}
                        className="auth-btn-google"
                      >
                        {googlePending ? (
                          <Loader2 className="size-4 animate-spin text-white/60" />
                        ) : (
                          <GoogleIcon />
                        )}
                        <span>{googlePending ? "Redirecting to Google..." : "Continue with Google"}</span>
                      </button>

                      {/* Divider */}
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/[0.07]" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                          or with email
                        </span>
                        <div className="h-px flex-1 bg-white/[0.07]" />
                      </div>
                    </>
                  ) : null}

                  {/* Email form */}
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <AnimatePresence initial={false}>
                      {isSignup && (
                        <motion.div
                          key="name-field"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden"
                        >
                          <Field label="Full name" icon={User}>
                            <input
                              id="name-input"
                              required
                              value={form.name}
                              onChange={updateField("name")}
                              className="auth-field"
                              placeholder="Your name"
                              autoComplete="name"
                            />
                          </Field>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Field label="Email address" icon={Mail}>
                      <input
                        id="email-input"
                        type="email"
                        required
                        value={form.email}
                        onChange={updateField("email")}
                        className="auth-field"
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </Field>

                    <Field label="Password" icon={LockKeyhole}>
                      <div className="relative">
                        <input
                          id="password-input"
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={12}
                          value={form.password}
                          onChange={updateField("password")}
                          className="auth-field pr-11"
                          placeholder="At least 12 characters"
                          autoComplete={isSignup ? "new-password" : "current-password"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] transition-colors hover:text-white"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </Field>

                    {isSignup && <PasswordStrength password={form.password} />}

                    {!isSignup && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => { setForgotVisible(true); setForgotEmail(form.email); setError(""); }}
                          className="text-xs text-[var(--muted)] transition-colors hover:text-white"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    {error && <Banner variant="error">{error}</Banner>}

                    <SubmitButton
                      pending={pending}
                      label={isSignup ? "Create account" : "Sign in"}
                      pendingLabel={isSignup ? "Creating account…" : "Signing in…"}
                    />
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Card footer */}
          {!forgotVisible && !verificationState && (
            <div className="border-t border-white/[0.07] px-7 py-4 text-center text-sm text-[var(--muted)]">
              {isSignup ? "Already have an account? " : "Don't have an account? "}
              <Link
                href={isSignup ? "/sign-in" : "/sign-up"}
                className="font-semibold text-white transition-colors hover:text-white/80"
              >
                {isSignup ? "Sign in" : "Create one"}
              </Link>
            </div>
          )}
        </motion.div>

        {/* Privacy note */}
        <p className="text-center text-[11px] leading-relaxed text-[var(--muted)]">
          Your data is private and scoped to your account only.
        </p>
      </div>
    </main>
  );
}

/* ── Sub-components ── */

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="auth-label">
        <Icon className="size-3.5" />
        {label}
      </span>
      {children}
    </label>
  );
}

function SubmitButton({
  pending,
  label,
  pendingLabel,
  onClick,
  type = "submit",
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
  onClick?: () => void;
  type?: "submit" | "button";
}) {
  return (
    <button
      type={type}
      disabled={pending}
      onClick={onClick}
      className="auth-btn-primary flex items-center justify-center gap-2"
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending ? pendingLabel : label}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-fit items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white"
    >
      <ArrowLeft className="size-4" />
      Back
    </button>
  );
}

function Banner({
  children,
  variant = "info",
}: {
  children: React.ReactNode;
  variant?: "info" | "success" | "error";
}) {
  const styles = {
    info: "border-white/[0.08] bg-white/[0.04] text-white/80",
    success: "border-emerald-500/20 bg-emerald-950/30 text-emerald-300",
    error: "border-red-500/20 bg-red-950/25 text-red-300",
  };
  return (
    <div className={`rounded-[14px] border px-4 py-3 text-sm leading-[1.7] ${styles[variant]}`}>
      {children}
    </div>
  );
}




