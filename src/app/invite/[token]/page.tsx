"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = params.token;
  const [info, setInfo] = useState<{ organizationName: string; email: string; role: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    void fetch(`/api/org/invites/${token}`)
      .then(async (response) => {
        const payload = (await response.json()) as {
          organizationName?: string;
          email?: string;
          role?: string;
          error?: string;
        };
        if (!response.ok) {
          setError(payload.error ?? "Invite is invalid or expired.");
          return;
        }
        setInfo({
          organizationName: payload.organizationName ?? "this workspace",
          email: payload.email ?? "",
          role: payload.role ?? "MEMBER",
        });
      })
      .catch(() => setError("Could not load invite."));
  }, [token]);

  async function accept() {
    setAccepting(true);
    setError(null);
    const response = await fetch("/api/org/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const payload = (await response.json()) as { error?: string };
    setAccepting(false);
    if (!response.ok) {
      setError(payload.error ?? "Failed to accept invite.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`;

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-background-primary px-4 py-10">
      <div className="w-full max-w-md space-y-4 rounded-panel border border-border bg-background-card p-6">
        <h1 className="text-2xl font-semibold text-text-primary">Join workspace</h1>
        {error ? <p className="text-sm text-rag-red">{error}</p> : null}
        {info ? (
          <>
            <p className="text-sm text-text-secondary">
              You&apos;re invited to <span className="text-text-primary">{info.organizationName}</span> as{" "}
              {info.role.toLowerCase()}.
            </p>
            <p className="text-xs text-text-muted">This invite is for {info.email}.</p>
            {status === "loading" ? (
              <p className="text-sm text-text-muted">Checking session…</p>
            ) : session?.user ? (
              <button
                type="button"
                onClick={() => void accept()}
                disabled={accepting}
                className="rounded-[3px] bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-black disabled:opacity-60"
              >
                {accepting ? "Joining…" : "Accept invite"}
              </button>
            ) : (
              <Link
                href={loginHref}
                className="inline-flex rounded-[3px] bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-black"
              >
                Sign in to accept
              </Link>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
