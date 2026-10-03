"use client";

import Link from "next/link";
import { useState } from "react";

import type { OnboardingItemId, OnboardingStatus } from "@/lib/onboarding/types";

interface OnboardingChecklistProps {
  initialStatus: OnboardingStatus;
  onStatusChange?: (status: OnboardingStatus) => void;
}

export function OnboardingChecklist({ initialStatus, onStatusChange }: OnboardingChecklistProps) {
  const [status, setStatus] = useState(initialStatus);
  const [email, setEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!status.showChecklist) {
    return null;
  }

  async function refreshFrom(payload: OnboardingStatus) {
    setStatus(payload);
    onStatusChange?.(payload);
  }

  async function reload() {
    const response = await fetch("/api/onboarding");
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as OnboardingStatus;
    await refreshFrom(payload);
  }

  async function chooseManual() {
    setBusy(true);
    const response = await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "choose_manual" }),
    });
    if (response.ok) {
      await refreshFrom((await response.json()) as OnboardingStatus);
    }
    setBusy(false);
  }

  async function deferInvite() {
    setBusy(true);
    const response = await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "defer_invite" }),
    });
    if (response.ok) {
      await refreshFrom((await response.json()) as OnboardingStatus);
    }
    setBusy(false);
  }

  async function sendInvite() {
    setInviteError(null);
    setInviteMessage(null);
    setBusy(true);
    const response = await fetch("/api/org/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: "MEMBER" }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setInviteError(payload.error ?? "Failed to invite");
      setBusy(false);
      return;
    }
    setEmail("");
    setInviteMessage("Invite sent");
    await reload();
    setBusy(false);
  }

  const next = status.items.find((item) => !item.done);

  function itemAction(id: OnboardingItemId, href?: string) {
    switch (id) {
      case "project":
        return null;
      case "source":
        return (
          <div className="mt-2 flex flex-wrap gap-3">
            {href ? (
              <Link href={href} className="text-sm text-accent-blue hover:underline">
                Map a tool on the project
              </Link>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void chooseManual()}
              className="text-sm text-text-muted hover:text-text-primary"
            >
              Continue with manual input
            </button>
          </div>
        );
      case "report":
        return href ? (
          <Link
            href={href}
            className="mt-2 inline-flex rounded-[3px] bg-ink px-3 py-2 text-sm font-semibold text-cream hover:bg-black"
          >
            Generate your first report →
          </Link>
        ) : null;
      case "invite":
        return (
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap gap-2">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@company.com"
                className="min-w-[16rem] flex-1 rounded-md border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
              />
              <button
                type="button"
                disabled={busy || !email.trim()}
                onClick={() => void sendInvite()}
                className="rounded-[3px] bg-ink px-3 py-2 text-sm font-semibold text-cream hover:bg-black disabled:opacity-60"
              >
                Send invite
              </button>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void deferInvite()}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              I&apos;ll invite later
            </button>
            {inviteError ? <p className="text-xs text-rag-red">{inviteError}</p> : null}
            {inviteMessage ? <p className="text-xs text-rag-green">{inviteMessage}</p> : null}
          </div>
        );
      default: {
        const exhaustive: never = id;
        return exhaustive;
      }
    }
  }

  return (
    <section className="rounded-panel border border-cyan/30 bg-cyan/5 p-6">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-strong">Getting started</p>
      <h2 className="mt-1 font-display text-lg font-semibold tracking-[-0.02em] text-ink">
        {status.ahaComplete ? "Invite someone to the workspace" : "Generate your first weekly report"}
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        {status.ahaComplete
          ? "The first report exists. Invite a teammate so this stays a team tool."
          : "One real report for a project in this workspace — that is the moment the product clicks."}
      </p>
      <ol className="mt-4 space-y-3">
        {status.items.map((item, index) => (
          <li key={item.id} className="rounded-[3px] border border-line bg-paper/80 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ink">
                  {index + 1}. {item.label}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">{item.detail}</p>
              </div>
              <span
                className={`shrink-0 rounded-[3px] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${
                  item.done ? "bg-rag-green/10 text-rag-green" : "bg-faint text-text-muted"
                }`}
              >
                {item.done ? "Done" : "Next"}
              </span>
            </div>
            {!item.done && next?.id === item.id ? itemAction(item.id, item.href) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
