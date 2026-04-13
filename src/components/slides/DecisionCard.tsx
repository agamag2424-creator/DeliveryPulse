"use client";

import { ArrowUpCircle, Check, CheckCircle2, Clock } from "lucide-react";

import type { Decision } from "@/types/report";

export type DecisionSessionStatus = "pending" | "accepted" | "escalated" | "deferred";
export type DecisionInputMode = "none" | "escalate" | "defer";

export interface DecisionSessionState {
  status: DecisionSessionStatus;
  timestamp?: string;
  escalatedTo?: string;
  deferredDate?: string;
  deferredReason?: string;
  mode: DecisionInputMode;
  draftEscalatedTo: string;
  draftDeferredDate: string;
  draftDeferredReason: string;
  touchedDeferFields?: boolean;
}

interface DecisionCardProps {
  decision: Decision;
  impactText: string;
  state: DecisionSessionState;
  onAccept: () => void;
  onShowEscalate: () => void;
  onEscalateDraftChange: (value: string) => void;
  onEscalateConfirm: () => void;
  onShowDefer: () => void;
  onDeferDateChange: (value: string) => void;
  onDeferReasonChange: (value: string) => void;
  onDeferConfirm: () => void;
}

const priorityStyles: Record<Decision["priority"], { badge: string; border: string; label: string }> = {
  Critical: {
    badge: "bg-red-500/20 text-red-400 border border-red-500/30",
    border: "border-red-500",
    label: "CRITICAL",
  },
  High: {
    badge: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    border: "border-amber-500",
    label: "HIGH",
  },
  Normal: {
    badge: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    border: "border-blue-500",
    label: "NORMAL",
  },
};

function formatDate(date: string) {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DecisionCard({
  decision,
  impactText,
  state,
  onAccept,
  onShowEscalate,
  onEscalateDraftChange,
  onEscalateConfirm,
  onShowDefer,
  onDeferDateChange,
  onDeferReasonChange,
  onDeferConfirm,
}: DecisionCardProps) {
  const priority = priorityStyles[decision.priority];
  const isPending = state.status === "pending";
  const dueDate = decision.dueDate ? new Date(decision.dueDate) : null;
  const overdue = dueDate !== null && !Number.isNaN(dueDate.getTime()) && dueDate < new Date();
  const dueText = decision.dueDate ? formatDate(decision.dueDate) : "—";

  const resolvedBackground =
    state.status === "accepted"
      ? "bg-green-500/5 border-green-500"
      : state.status === "escalated"
        ? "bg-red-500/5 border-red-500"
        : state.status === "deferred"
          ? "bg-gray-500/5 border-gray-700 opacity-65"
          : "bg-[#111827]";

  const ownerParts = decision.ownerNameRole.split(",");
  const ownerName = ownerParts[0]?.trim() ?? decision.ownerNameRole;
  const ownerRole = ownerParts.slice(1).join(",").trim();

  return (
    <article
      className={`rounded-xl border-l-4 p-5 transition-all duration-300 ${isPending ? `bg-[#111827] ${priority.border}` : resolvedBackground}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${priority.badge}`}>{priority.label}</span>
        <span className={`text-xs ${overdue ? "text-red-400" : "text-gray-500"}`}>
          {overdue ? `Overdue: ${dueText}` : `Due: ${dueText}`}
        </span>
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug text-white">{decision.decisionTitle}</h3>
      <p className="mt-2 text-xs text-gray-500">
        {ownerName}
        {ownerRole ? `, ${ownerRole}` : ""} · {decision.ownerOrganisation}
      </p>
      <div className="mt-2">
        <p className="text-xs font-semibold text-amber-500">Impact if delayed:</p>
        <p className="mt-0.5 text-xs text-gray-400">{impactText}</p>
      </div>

      {isPending && state.mode === "none" ? (
        <div className="mt-4 flex flex-col gap-2 md:flex-row">
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-400 transition-all duration-150 hover:border-green-500/50 hover:bg-green-500/20"
            onClick={onAccept}
          >
            <Check className="h-3.5 w-3.5" />
            Accept
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20"
            onClick={onShowEscalate}
          >
            <ArrowUpCircle className="h-3.5 w-3.5" />
            Escalate
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-700 bg-gray-500/10 px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-500/20"
            onClick={onShowDefer}
          >
            <Clock className="h-3.5 w-3.5" />
            Defer
          </button>
        </div>
      ) : null}

      {isPending && state.mode === "escalate" ? (
        <div className="mt-4 flex flex-col gap-2 md:flex-row">
          <input
            autoFocus
            type="text"
            value={state.draftEscalatedTo}
            onChange={(event) => onEscalateDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onEscalateConfirm();
            }}
            placeholder="Escalate to - enter name"
            className="w-full rounded-lg border border-red-500/50 bg-[#1F2937] px-3 py-2 text-sm text-white outline-none"
          />
          <button
            type="button"
            onClick={onEscalateConfirm}
            className="rounded bg-red-500/20 px-3 py-2 text-red-400"
          >
            →
          </button>
        </div>
      ) : null}

      {isPending && state.mode === "defer" ? (
        <div className="mt-4 flex flex-col gap-2 md:flex-row">
          <input
            type="date"
            value={state.draftDeferredDate}
            onChange={(event) => onDeferDateChange(event.target.value)}
            className={`w-full rounded-lg bg-[#1F2937] px-3 py-2 text-sm text-white outline-none md:w-40 ${
              state.touchedDeferFields && !state.draftDeferredDate ? "border border-red-500" : "border border-gray-700"
            }`}
          />
          <input
            type="text"
            placeholder="Reason for deferral"
            value={state.draftDeferredReason}
            onChange={(event) => onDeferReasonChange(event.target.value)}
            className={`w-full flex-1 rounded-lg bg-[#1F2937] px-3 py-2 text-sm text-white outline-none ${
              state.touchedDeferFields && !state.draftDeferredReason ? "border border-red-500" : "border border-gray-700"
            }`}
          />
          <button
            type="button"
            onClick={onDeferConfirm}
            className="rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600"
          >
            Confirm
          </button>
        </div>
      ) : null}

      {state.status === "accepted" ? (
        <div className="mt-4 flex items-center text-xs text-green-400">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-green-500" />
          Accepted in session - {state.timestamp}
        </div>
      ) : null}
      {state.status === "escalated" ? (
        <div className="mt-4 text-xs text-red-400">⏫ Escalated to {state.escalatedTo} - {state.timestamp}</div>
      ) : null}
      {state.status === "deferred" ? (
        <div className="mt-4 text-xs text-gray-500">
          ⏳ Deferred to {state.deferredDate} - {state.deferredReason}
        </div>
      ) : null}
    </article>
  );
}
