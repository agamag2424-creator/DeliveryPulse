"use client";

import Link from "next/link";
import { useState } from "react";

import { FormInput } from "@/components/form/FormInput";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message ?? "If an account exists for that email, a reset link has been sent.");
    setIsSubmitting(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background-primary px-4">
      <form onSubmit={(e) => void handleSubmit(e)} className="w-full max-w-md rounded-panel border border-border bg-background-card p-6">
        <h1 className="text-xl font-semibold text-text-primary">Forgot password</h1>
        <p className="mt-2 text-sm text-text-secondary">Enter your email and we&apos;ll send a reset link.</p>
        <div className="mt-4">
          <FormInput id="email" label="Email" type="email" mandatory value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {message ? <p className="mt-3 text-sm text-rag-green">{message}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-4 rounded-[3px] bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:bg-black disabled:opacity-60"
        >
          Send reset link
        </button>
        <p className="mt-4 text-sm">
          <Link href="/login" className="text-accent-blue hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
