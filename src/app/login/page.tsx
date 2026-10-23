"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";

import { FormInput } from "@/components/form/FormInput";

const AUTH_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked:
    "This email is already linked to another sign-in method. Use the original provider or email/password.",
  CredentialsSignin: "Invalid email or password.",
  Configuration:
    "Google OAuth failed: the client secret in .env.local does not match Google Cloud Console. Open Credentials → your OAuth client → copy a fresh Client secret, update GOOGLE_CLIENT_SECRET, restart the dev server.",
  Default: "Sign in failed. Please try again.",
};

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
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

function GitHubIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 fill-current" viewBox="0 0 24 24">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const authError = errorCode ? AUTH_ERRORS[errorCode] ?? AUTH_ERRORS.Default : null;

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupStatus, setSetupStatus] = useState<{
    google: boolean;
    github: boolean;
    database: boolean;
  } | null>(null);

  useEffect(() => {
    void fetch("/api/auth/setup-status")
      .then((res) => res.json())
      .then((data: { google: boolean; github: boolean; database: boolean }) => setSetupStatus(data))
      .catch(() => setSetupStatus({ google: false, github: false, database: false }));
  }, []);

  const displayError = formError ?? authError;
  const googleReady = setupStatus?.google ?? false;
  const githubReady = setupStatus?.github ?? false;
  const showOAuthSection = googleReady || githubReady;

  async function handleOAuthSignIn(provider: "google" | "github") {
    setFormError(null);
    // Full-page redirect — required for OAuth (passkey/consent happens on provider site)
    await signIn(provider, { callbackUrl });
  }

  async function handleCredentialsSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        const registerResponse = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name: name || undefined }),
        });
        const registerPayload = (await registerResponse.json()) as { error?: string; requiresVerification?: boolean };
        if (!registerResponse.ok) {
          setFormError(registerPayload.error ?? "Registration failed.");
          return;
        }
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setFormError(AUTH_ERRORS.CredentialsSignin);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setFormError(AUTH_ERRORS.Default);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-background-primary px-4 py-10">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-text-primary">DeliveryPulse</h1>
          <p className="text-sm text-text-secondary">AI-powered project status.</p>
          <p className="text-sm text-text-secondary">Built for delivery leaders.</p>
        </div>

        <div className="space-y-4 rounded-panel border border-border bg-background-card p-6">
          {displayError ? (
            <div className="rounded-lg border border-rag-red/40 bg-rag-red/10 px-4 py-3 text-sm text-rag-red">
              {displayError}
            </div>
          ) : null}

          {setupStatus && !setupStatus.database ? (
            <div className="rounded-lg border border-rag-amber/40 bg-rag-amber/10 px-4 py-3 text-sm text-rag-amber">
              Database not connected. Run{" "}
              <code className="rounded bg-background-elevated px-1 py-0.5 text-xs">npx prisma dev -d</code>{" "}
              and set DATABASE_URL in .env.local.
            </div>
          ) : null}

          {setupStatus && !googleReady && !githubReady ? (
            <div className="rounded-lg border border-cyan/30 bg-cyan/5 px-4 py-3 text-sm text-cyan-strong">
              OAuth is not configured yet. Use email/password below, or add GOOGLE_CLIENT_ID and
              GOOGLE_CLIENT_SECRET to .env.local.
            </div>
          ) : null}

          {googleReady ? (
            <p className="text-xs text-text-muted">
              Google may ask for a passkey. If it gets stuck, choose <strong className="text-text-secondary">Try another way</strong> and sign in with your password.
            </p>
          ) : null}

          {googleReady ? (
            <button
              type="button"
              onClick={() => void handleOAuthSignIn("google")}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-100"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          ) : null}

          {githubReady ? (
            <button
              type="button"
              onClick={() => void handleOAuthSignIn("github")}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-[#24292e] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2f363d]"
            >
              <GitHubIcon />
              Continue with GitHub
            </button>
          ) : null}

          {showOAuthSection ? (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-text-muted">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleCredentialsSubmit}>
            {mode === "signup" ? (
              <FormInput
                id="name"
                label="Name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            ) : null}
            <FormInput
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              mandatory
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <FormInput
              id="password"
              label="Password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              mandatory
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {mode === "signin" ? (
              <p className="text-right text-xs">
                <a href="/forgot-password" className="text-accent-blue hover:underline">
                  Forgot password?
                </a>
              </p>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-[3px] bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:bg-black disabled:opacity-60"
            >
              {isSubmitting ? "Please wait…" : mode === "signup" ? "Create Account" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs text-text-muted">
            {mode === "signin" ? (
              <>
                No account?{" "}
                <button
                  type="button"
                  className="text-accent-blue hover:underline"
                  onClick={() => {
                    setMode("signup");
                    setFormError(null);
                  }}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-accent-blue hover:underline"
                  onClick={() => {
                    setMode("signin");
                    setFormError(null);
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <p className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">
          DeliveryPulse by ChisokuLabs
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-background-primary">
          <p className="text-sm text-text-secondary">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
