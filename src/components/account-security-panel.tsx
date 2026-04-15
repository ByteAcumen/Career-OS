"use client";

import { type ComponentType, type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  MailCheck,
  MonitorSmartphone,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import { cn } from "@/lib/utils";

type AuthSessionResponse = {
  session: {
    id: string;
    token: string;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null;
    twoFactorEnabled?: boolean;
  };
} | null;

type SessionRecord = {
  id: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type AuthRequestOptions = Omit<RequestInit, "body" | "headers" | "method"> & {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  headers?: HeadersInit;
  body?: unknown;
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

async function authJson<T>(
  url: string,
  init?: AuthRequestOptions,
): Promise<T> {
  const { body, headers, ...rest } = init ?? {};

  const response = await fetch(url, {
    method: rest.method ?? (body === undefined ? "GET" : "POST"),
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    ...rest,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string; error?: string }
    | T
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object"
        ? ("message" in payload && payload.message) || ("error" in payload && payload.error)
        : null;
    throw new Error(message || "Request failed.");
  }

  return payload as T;
}

async function readSecuritySnapshot() {
  const [session, sessions] = await Promise.all([
    authJson<AuthSessionResponse>("/api/auth/get-session"),
    authJson<SessionRecord[]>("/api/auth/list-sessions"),
  ]);

  return { session, sessions };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateTimeFormatter.format(date);
}

function describeSession(session: SessionRecord) {
  const agent = session.userAgent?.trim();
  if (agent) {
    return agent.length > 88 ? `${agent.slice(0, 88)}...` : agent;
  }

  if (session.ipAddress) {
    return `IP ${session.ipAddress}`;
  }

  return "Browser session";
}

export function AccountSecurityPanel() {
  const [sessionState, setSessionState] = useState<AuthSessionResponse>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [securityPassword, setSecurityPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [twoFactorBusy, setTwoFactorBusy] = useState<null | "enable" | "verify" | "regenerate" | "disable">(null);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const snapshot = await readSecuritySnapshot();

        if (!active) {
          return;
        }

        setSessionState(snapshot.session);
        setSessions(snapshot.sessions);
      } catch (error) {
        if (!active) {
          return;
        }

        setBanner({
          type: "error",
          text: error instanceof Error ? error.message : "Could not load account security.",
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  async function refreshSecurityState() {
    setRefreshing(true);

    try {
      const snapshot = await readSecuritySnapshot();
      setSessionState(snapshot.session);
      setSessions(snapshot.sessions);
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Could not refresh account security.",
      });
    } finally {
      setRefreshing(false);
    }
  }

  const currentSessionToken = sessionState?.session.token ?? "";
  const email = sessionState?.user.email ?? "";
  const emailVerified = Boolean(sessionState?.user.emailVerified);
  const twoFactorEnabled = Boolean(sessionState?.user.twoFactorEnabled);

  const currentSession = useMemo(
    () => sessions.find((entry) => entry.token === currentSessionToken) ?? null,
    [currentSessionToken, sessions],
  );

  const otherSessions = useMemo(
    () => sessions.filter((entry) => entry.token !== currentSessionToken),
    [currentSessionToken, sessions],
  );

  const totpSecret = useMemo(() => {
    if (!totpUri) return "";

    try {
      return new URL(totpUri).searchParams.get("secret") ?? "";
    } catch {
      return "";
    }
  }, [totpUri]);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBanner(null);

    if (newPassword.length < 12) {
      setBanner({
        type: "error",
        text: "Password must be at least 12 characters long.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setBanner({
        type: "error",
        text: "New password and confirmation do not match.",
      });
      return;
    }

    setPasswordSaving(true);

    try {
      await authJson<{ ok: boolean; message: string }>("/api/auth/set-password", {
        method: "POST",
        body: {
          newPassword,
          ...(currentPassword ? { currentPassword } : {}),
        },
      });

      setBanner({
        type: "success",
        text: "Password updated. Other sessions were signed out for safety.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await refreshSecurityState();
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Could not update password.",
      });
    } finally {
      setPasswordSaving(false);
    }
  }

  async function sendVerificationLink() {
    if (!email) return;

    setBanner(null);

    try {
      await authJson<{ status: boolean; message: string }>("/api/auth/send-verification-email", {
        method: "POST",
        body: {
          email,
          callbackURL: "/home",
        },
      });

      setBanner({
        type: "success",
        text: `Verification email sent to ${email}.`,
      });
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Could not send verification email.",
      });
    }
  }

  async function revokeOtherSessions() {
    setBanner(null);

    try {
      await authJson<{ status: boolean }>("/api/auth/revoke-other-sessions", {
        method: "POST",
      });

      setBanner({
        type: "success",
        text: "Signed out every other device.",
      });
      await refreshSecurityState();
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Could not revoke other sessions.",
      });
    }
  }

  async function revokeSession(token: string) {
    setBanner(null);

    try {
      await authJson<{ status: boolean }>("/api/auth/revoke-session", {
        method: "POST",
        body: { token },
      });

      if (token === currentSessionToken) {
        window.location.replace("/sign-in");
        return;
      }

      setBanner({
        type: "success",
        text: "Session revoked.",
      });
      await refreshSecurityState();
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Could not revoke session.",
      });
    }
  }

  async function enableTwoFactor() {
    if (!securityPassword) {
      setBanner({
        type: "error",
        text: "Enter your current password before enabling two-factor authentication.",
      });
      return;
    }

    setTwoFactorBusy("enable");
    setBanner(null);

    try {
      const payload = await authJson<{ totpURI: string; backupCodes: string[] }>(
        "/api/auth/two-factor/enable",
        {
          method: "POST",
          body: {
            password: securityPassword,
            issuer: "Career OS",
          },
        },
      );

      setTotpUri(payload.totpURI);
      setBackupCodes(payload.backupCodes);
      setBanner({
        type: "success",
        text: "Authenticator setup created. Enter the 6-digit code to finish enabling 2FA.",
      });
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Could not enable two-factor authentication.",
      });
    } finally {
      setTwoFactorBusy(null);
    }
  }

  async function verifyTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!totpCode.trim()) {
      setBanner({
        type: "error",
        text: "Enter the 6-digit authenticator code to verify setup.",
      });
      return;
    }

    setTwoFactorBusy("verify");
    setBanner(null);

    try {
      await authJson("/api/auth/two-factor/verify-totp", {
        method: "POST",
        body: {
          code: totpCode.trim(),
          trustDevice: false,
        },
      });

      setTotpCode("");
      setTotpUri("");
      setBanner({
        type: "success",
        text: "Two-factor authentication is now active on your account.",
      });
      await refreshSecurityState();
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Could not verify the authenticator code.",
      });
    } finally {
      setTwoFactorBusy(null);
    }
  }

  async function regenerateBackupCodes() {
    if (!securityPassword) {
      setBanner({
        type: "error",
        text: "Enter your current password before generating new backup codes.",
      });
      return;
    }

    setTwoFactorBusy("regenerate");
    setBanner(null);

    try {
      const payload = await authJson<{ status: boolean; backupCodes: string[] }>(
        "/api/auth/two-factor/generate-backup-codes",
        {
          method: "POST",
          body: {
            password: securityPassword,
          },
        },
      );

      setBackupCodes(payload.backupCodes);
      setBanner({
        type: "success",
        text: "Backup codes regenerated. Replace the ones you stored before.",
      });
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Could not regenerate backup codes.",
      });
    } finally {
      setTwoFactorBusy(null);
    }
  }

  async function disableTwoFactor() {
    if (!securityPassword) {
      setBanner({
        type: "error",
        text: "Enter your current password before disabling two-factor authentication.",
      });
      return;
    }

    setTwoFactorBusy("disable");
    setBanner(null);

    try {
      await authJson<{ status: boolean }>("/api/auth/two-factor/disable", {
        method: "POST",
        body: {
          password: securityPassword,
        },
      });

      setTotpUri("");
      setTotpCode("");
      setBackupCodes([]);
      setBanner({
        type: "success",
        text: "Two-factor authentication has been disabled.",
      });
      await refreshSecurityState();
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Could not disable two-factor authentication.",
      });
    } finally {
      setTwoFactorBusy(null);
    }
  }

  return (
    <div className="glass-card overflow-hidden rounded-[28px] border border-[var(--line)]">
      <div className="flex flex-col gap-4 border-b border-[var(--line)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex size-11 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04]">
            <ShieldCheck className="size-5 text-white" />
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-tight text-[var(--ink)]">
              Account security
            </div>
            <div className="mt-0.5 text-xs text-[var(--muted)]">
              Verify email, manage sessions, and lock the workspace behind 2FA.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void refreshSecurityState()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-[16px] border border-[var(--line)] bg-white/[0.03] px-3 py-2 text-xs font-medium text-[var(--ink)] transition hover:bg-white/[0.06] disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3.5", refreshing ? "animate-spin" : "")} />
          Refresh
        </button>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        {banner ? (
          <div
            className={cn(
              "rounded-[20px] border px-4 py-3 text-sm",
              banner.type === "success"
                ? "border-white/10 bg-white/[0.05] text-[var(--muted-strong)]"
                : "border-white/8 bg-white/[0.02] text-rose-200",
            )}
          >
            {banner.text}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <SecurityStat
            icon={emailVerified ? MailCheck : ShieldAlert}
            label="Email status"
            value={emailVerified ? "Verified" : "Needs verification"}
            detail={email || "Secure email sign-in"}
          />
          <SecurityStat
            icon={twoFactorEnabled ? Smartphone : ShieldCheck}
            label="Two-factor"
            value={twoFactorEnabled ? "Enabled" : "Recommended"}
            detail={twoFactorEnabled ? "Authenticator protection active" : "Add an authenticator app"}
          />
          <SecurityStat
            icon={MonitorSmartphone}
            label="Sessions"
            value={`${sessions.length}`}
            detail={sessions.length === 1 ? "1 active device" : `${sessions.length} active devices`}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Section
            title="Email verification"
            subtitle="Require inbox proof before password sign-in is allowed."
            action={
              !emailVerified ? (
                <button
                  type="button"
                  onClick={() => void sendVerificationLink()}
                  className="rounded-[16px] border border-[var(--line)] bg-white/[0.04] px-3 py-2 text-xs font-medium text-[var(--ink)] transition hover:bg-white/[0.06]"
                >
                  Send link
                </button>
              ) : null
            }
          >
            <div className="rounded-[22px] border border-[var(--line)] bg-white/[0.03] p-4 text-sm leading-7 text-[var(--muted)]">
              {emailVerified ? (
                <span className="text-[var(--muted-strong)]">
                  This account is verified and can sign in with email and password safely.
                </span>
              ) : (
                <span>
                  Password sign-in is locked until this email address is verified. If you signed up
                  recently, open the latest verification email for <strong className="text-white">{email}</strong>.
                </span>
              )}
            </div>
          </Section>

          <Section
            title="Active sessions"
            subtitle="Review current devices and sign out anything you do not recognize."
            action={
              otherSessions.length ? (
                <button
                  type="button"
                  onClick={() => void revokeOtherSessions()}
                  className="rounded-[16px] border border-[var(--line)] bg-white/[0.04] px-3 py-2 text-xs font-medium text-[var(--ink)] transition hover:bg-white/[0.06]"
                >
                  Sign out others
                </button>
              ) : null
            }
          >
            <div className="space-y-3">
              {loading ? (
                <SecurityPlaceholder />
              ) : (
                <>
                  {currentSession ? (
                    <SessionCard
                      label="Current device"
                      session={currentSession}
                      current
                      onRevoke={() => void revokeSession(currentSession.token)}
                    />
                  ) : null}
                  {otherSessions.map((entry) => (
                    <SessionCard
                      key={entry.id}
                      label="Other session"
                      session={entry}
                      onRevoke={() => void revokeSession(entry.token)}
                    />
                  ))}
                  {!currentSession && !otherSessions.length ? (
                    <div className="rounded-[20px] border border-[var(--line)] bg-white/[0.03] px-4 py-5 text-sm text-[var(--muted)]">
                      No active sessions found.
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </Section>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Section
            title="Password protection"
            subtitle="Minimum 12 characters. Changing your password revokes other sessions automatically."
          >
            <form onSubmit={handlePasswordSubmit} className="grid gap-4">
              <Field
                label="Current password"
                hint="Leave empty only if this account currently signs in with Google only."
              >
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="field h-11 w-full bg-[var(--card)] text-[14px]"
                  autoComplete="current-password"
                  placeholder="Current password"
                />
              </Field>

              <Field label="New password">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="field h-11 w-full bg-[var(--card)] text-[14px]"
                  autoComplete="new-password"
                  placeholder="At least 12 characters"
                  minLength={12}
                  required
                />
              </Field>

              <Field label="Confirm password">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="field h-11 w-full bg-[var(--card)] text-[14px]"
                  autoComplete="new-password"
                  placeholder="Repeat the new password"
                  minLength={12}
                  required
                />
              </Field>

              <button
                type="submit"
                disabled={passwordSaving}
                className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300"
              >
                {passwordSaving ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                {passwordSaving ? "Updating password..." : "Update password"}
              </button>
            </form>
          </Section>

          <Section
            title="Two-factor authentication"
            subtitle="Use an authenticator app and keep backup codes stored somewhere offline."
          >
            <div className="grid gap-4">
              <Field
                label="Current password"
                hint="Needed for 2FA setup, disable, and backup-code rotation."
              >
                <input
                  type="password"
                  value={securityPassword}
                  onChange={(event) => setSecurityPassword(event.target.value)}
                  className="field h-11 w-full bg-[var(--card)] text-[14px]"
                  autoComplete="current-password"
                  placeholder="Current password"
                />
              </Field>

              <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)]">
                {!twoFactorEnabled ? (
                  <button
                    type="button"
                    onClick={() => void enableTwoFactor()}
                    disabled={twoFactorBusy !== null}
                    className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300"
                  >
                    {twoFactorBusy === "enable" ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="size-4" />
                    )}
                    Enable 2FA
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void regenerateBackupCodes()}
                    disabled={twoFactorBusy !== null}
                    className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-[18px] border border-[var(--line)] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {twoFactorBusy === "regenerate" ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    New backup codes
                  </button>
                )}

                {twoFactorEnabled ? (
                  <button
                    type="button"
                    onClick={() => void disableTwoFactor()}
                    disabled={twoFactorBusy !== null}
                    className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-[18px] border border-[var(--line)] bg-white/[0.02] px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {twoFactorBusy === "disable" ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <ShieldAlert className="size-4" />
                    )}
                    Disable 2FA
                  </button>
                ) : (
                  <div className="rounded-[18px] border border-[var(--line)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--muted)]">
                    Set a password first if this account only used Google sign-in before.
                  </div>
                )}
              </div>

              {totpUri ? (
                <div className="grid gap-4 rounded-[22px] border border-[var(--line)] bg-white/[0.03] p-4">
                  <div>
                    <div className="text-sm font-semibold text-white">Authenticator setup</div>
                    <p className="mt-1 text-sm leading-7 text-[var(--muted)]">
                      Add this secret to Google Authenticator, 1Password, Authy, or another TOTP app,
                      then enter the 6-digit code below.
                    </p>
                  </div>

                  <div className="rounded-[18px] border border-[var(--line)] bg-black/20 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      Manual secret
                    </div>
                    <div className="mt-2 break-all font-mono text-sm text-white">
                      {totpSecret || "Open the otpauth URI in your authenticator app."}
                    </div>
                  </div>

                  <form onSubmit={verifyTwoFactor} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={totpCode}
                      onChange={(event) => setTotpCode(event.target.value.replace(/\s+/g, ""))}
                      className="field h-11 w-full bg-[var(--card)] text-[14px]"
                      placeholder="6-digit authenticator code"
                      maxLength={8}
                      required
                    />
                    <button
                      type="submit"
                      disabled={twoFactorBusy !== null}
                      className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-300"
                    >
                      {twoFactorBusy === "verify" ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      Verify code
                    </button>
                  </form>
                </div>
              ) : null}

              {backupCodes.length ? (
                <div className="rounded-[22px] border border-[var(--line)] bg-white/[0.03] p-4">
                  <div className="text-sm font-semibold text-white">Backup codes</div>
                  <p className="mt-1 text-sm leading-7 text-[var(--muted)]">
                    Save these once. Each code can be used to recover access if your authenticator device is unavailable.
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {backupCodes.map((code) => (
                      <div
                        key={code}
                        className="rounded-[16px] border border-[var(--line)] bg-black/20 px-3 py-2 font-mono text-sm text-white"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="soft-card rounded-[24px] border border-[var(--line)] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold tracking-tight text-[var(--ink)]">{title}</div>
          <div className="mt-1 text-sm leading-7 text-[var(--muted)]">{subtitle}</div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs leading-6 text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}

function SecurityStat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04]">
          <Icon className="size-4.5 text-white" />
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            {label}
          </div>
          <div className="mt-1 text-lg font-semibold text-white">{value}</div>
        </div>
      </div>
      <div className="mt-3 text-sm leading-7 text-[var(--muted)]">{detail}</div>
    </div>
  );
}

function SessionCard({
  label,
  session,
  current = false,
  onRevoke,
}: {
  label: string;
  session: SessionRecord;
  current?: boolean;
  onRevoke: () => void;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--line)] bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            {label}
          </div>
          <div className="mt-1 text-sm font-medium text-white">{describeSession(session)}</div>
          <div className="mt-2 text-xs leading-6 text-[var(--muted)]">
            Signed in {formatDateTime(session.createdAt)}
          </div>
          <div className="text-xs leading-6 text-[var(--muted)]">
            Expires {formatDateTime(session.expiresAt)}
          </div>
          {session.ipAddress ? (
            <div className="text-xs leading-6 text-[var(--muted)]">IP {session.ipAddress}</div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onRevoke}
          className="rounded-[14px] border border-[var(--line)] bg-white/[0.04] px-3 py-2 text-xs font-medium text-[var(--ink)] transition hover:bg-white/[0.06]"
        >
          {current ? "Sign out" : "Revoke"}
        </button>
      </div>
    </div>
  );
}

function SecurityPlaceholder() {
  return (
    <div className="rounded-[20px] border border-[var(--line)] bg-white/[0.03] px-4 py-5 text-sm text-[var(--muted)]">
      Loading security state...
    </div>
  );
}
