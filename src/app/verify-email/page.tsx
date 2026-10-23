"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message ?? "Verification email sent.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background-primary px-4">
      <div className="w-full max-w-md rounded-panel border border-border bg-background-card p-6 text-center">
        <h1 className="text-xl font-semibold text-text-primary">Check your email</h1>
        <p className="mt-3 text-sm text-text-secondary">
          We sent a verification link{email ? ` to ${email}` : ""}. Click the link to access DeliveryPulse.
        </p>
        {message ? <p className="mt-3 text-sm text-rag-green">{message}</p> : null}
        <button
          type="button"
          onClick={() => void resend()}
          className="mt-4 text-sm text-accent-blue hover:underline"
        >
          Resend verification email
        </button>
        <p className="mt-6 text-sm">
          <Link href="/login" className="text-accent-blue hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
