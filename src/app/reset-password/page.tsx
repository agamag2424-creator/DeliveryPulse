"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { FormInput } from "@/components/form/FormInput";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setError(null);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, password }),
    });
    const payload = (await response.json()) as { error?: string; success?: boolean };
    if (!response.ok) {
      setError(payload.error ?? "Reset failed");
      return;
    }
    setMessage("Password updated. You can sign in now.");
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="w-full max-w-md rounded-panel border border-border bg-background-card p-6">
      <h1 className="text-xl font-semibold text-text-primary">Reset password</h1>
      <div className="mt-4 space-y-3">
        <FormInput id="password" label="New password" type="password" mandatory value={password} onChange={(e) => setPassword(e.target.value)} />
        <FormInput id="confirm" label="Confirm password" type="password" mandatory value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error ? <p className="mt-3 text-sm text-rag-red">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-rag-green">{message}</p> : null}
      <button type="submit" className="mt-4 rounded-[3px] bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:bg-black">
        Update password
      </button>
      <p className="mt-4 text-sm">
        <Link href="/login" className="text-accent-blue hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background-primary px-4">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
