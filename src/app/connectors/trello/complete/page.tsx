"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function TrelloCompleteInner() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Finishing Trello connection…");

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const token = new URLSearchParams(hash).get("token");
    const state = searchParams.get("state");

    if (!token || !state) {
      setMessage("Trello did not return a token. Close this window and try connecting again.");
      return;
    }

    void fetch("/api/connectors/trello/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, state }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as { redirectTo?: string; error?: string };
        if (!response.ok || !payload.redirectTo) {
          setMessage(payload.error ?? "Trello connection failed.");
          return;
        }
        window.location.replace(payload.redirectTo);
      })
      .catch(() => {
        setMessage("Trello connection failed.");
      });
  }, [searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-sm text-text-secondary">{message}</p>
    </main>
  );
}

export default function TrelloCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background px-4">
          <p className="text-sm text-text-secondary">Finishing Trello connection…</p>
        </main>
      }
    >
      <TrelloCompleteInner />
    </Suspense>
  );
}
