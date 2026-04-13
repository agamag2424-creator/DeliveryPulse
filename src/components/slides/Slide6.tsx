"use client";

import { CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";

import { DecisionCard, type DecisionSessionState } from "@/components/slides/DecisionCard";
import { SlideShell } from "@/components/slides/SlideShell";
import { SlideTitle } from "@/components/slides/SlideTitle";
import type { Decision, ReportInput, SlideData } from "@/types/report";

interface Slide6Props {
  reportInput: ReportInput;
  reportOutput: SlideData;
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const priorityRank: Record<Decision["priority"], number> = {
  Critical: 0,
  High: 1,
  Normal: 2,
};

function initialDecisionState(): DecisionSessionState {
  return {
    status: "pending",
    mode: "none",
    draftEscalatedTo: "",
    draftDeferredDate: "",
    draftDeferredReason: "",
    touchedDeferFields: false,
  };
}

export function Slide6({ reportInput, reportOutput }: Slide6Props) {
  const [states, setStates] = useState<DecisionSessionState[]>(
    reportInput.decisions.map(() => initialDecisionState()),
  );

  const impactByTitle = useMemo(
    () =>
      new Map(
        reportOutput.decision_impact_statements.map((item) => [item.decision_title.trim().toLowerCase(), item.impact]),
      ),
    [reportOutput.decision_impact_statements],
  );

  const openCount = states.filter((state) => state.status === "pending").length;
  const resolvedCount = states.length - openCount;
  const criticalCount = reportInput.decisions.filter((decision) => decision.priority === "Critical").length;
  const highCount = reportInput.decisions.filter((decision) => decision.priority === "High").length;
  const normalCount = reportInput.decisions.filter((decision) => decision.priority === "Normal").length;

  const sortedIndexes = reportInput.decisions
    .map((decision, index) => ({ decision, index }))
    .sort((a, b) => {
      const pr = priorityRank[a.decision.priority] - priorityRank[b.decision.priority];
      if (pr !== 0) return pr;
      const pendingA = states[a.index]?.status === "pending" ? 0 : 1;
      const pendingB = states[b.index]?.status === "pending" ? 0 : 1;
      if (pendingA !== pendingB) return pendingA - pendingB;
      return a.index - b.index;
    })
    .map((item) => item.index);

  function updateState(index: number, updater: (prev: DecisionSessionState) => DecisionSessionState) {
    setStates((prev) => prev.map((item, idx) => (idx === index ? updater(item) : item)));
  }

  if (reportInput.decisions.length === 0) {
    return (
      <SlideShell slideNumber={6} totalSlides={6}>
        <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-green-500/30 bg-green-500/10 p-8 text-center">
          <div>
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-green-500" />
            <p className="text-green-400">No decisions required this reporting period</p>
          </div>
        </div>
      </SlideShell>
    );
  }

  return (
    <SlideShell slideNumber={6} totalSlides={6}>
      <div className="grid gap-4">
        <SlideTitle title="Slide 6 - Decisions Required" />

        <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#111827] px-6 py-3">
          <div className="text-sm">
            {openCount === 0 && resolvedCount > 0 ? (
              <span className="font-semibold text-green-400">✅ All decisions resolved this session</span>
            ) : (
              <span className="text-text-primary">
                {openCount} open <span className="mx-2 text-gray-600">·</span> {resolvedCount} resolved this session
              </span>
            )}
          </div>
          <div className="shrink-0 whitespace-nowrap text-xs">
            <span className="mr-4 text-red-400">{criticalCount} Critical</span>
            <span className="mr-4 text-amber-400">{highCount} High</span>
            <span className="text-blue-400">{normalCount} Normal</span>
          </div>
        </section>

        <section className="grid max-h-[560px] grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          {sortedIndexes.map((index) => {
            const decision = reportInput.decisions[index];
            const state = states[index];
            const mappedImpact = impactByTitle.get(decision.decisionTitle.trim().toLowerCase());
            const impactText = mappedImpact || decision.impactIfDelayed || "Impact details pending";
            const resolvedOrder = state.status === "pending" ? 0 : 999;

            return (
              <div key={`${decision.decisionTitle}-${index}`} style={{ order: resolvedOrder }}>
                <DecisionCard
                  decision={decision}
                  impactText={impactText}
                  state={state}
                  onAccept={() =>
                    updateState(index, (prev) => ({
                      ...prev,
                      status: "accepted",
                      mode: "none",
                      timestamp: nowTime(),
                    }))
                  }
                  onShowEscalate={() =>
                    updateState(index, (prev) => ({
                      ...prev,
                      mode: "escalate",
                    }))
                  }
                  onEscalateDraftChange={(value) =>
                    updateState(index, (prev) => ({
                      ...prev,
                      draftEscalatedTo: value,
                    }))
                  }
                  onEscalateConfirm={() =>
                    updateState(index, (prev) => {
                      const target = prev.draftEscalatedTo.trim();
                      if (!target) return prev;
                      return {
                        ...prev,
                        status: "escalated",
                        mode: "none",
                        escalatedTo: target,
                        timestamp: nowTime(),
                      };
                    })
                  }
                  onShowDefer={() =>
                    updateState(index, (prev) => ({
                      ...prev,
                      mode: "defer",
                    }))
                  }
                  onDeferDateChange={(value) =>
                    updateState(index, (prev) => ({
                      ...prev,
                      draftDeferredDate: value,
                    }))
                  }
                  onDeferReasonChange={(value) =>
                    updateState(index, (prev) => ({
                      ...prev,
                      draftDeferredReason: value,
                    }))
                  }
                  onDeferConfirm={() =>
                    updateState(index, (prev) => {
                      if (!prev.draftDeferredDate || !prev.draftDeferredReason.trim()) {
                        return { ...prev, touchedDeferFields: true };
                      }
                      return {
                        ...prev,
                        status: "deferred",
                        mode: "none",
                        deferredDate: prev.draftDeferredDate,
                        deferredReason: prev.draftDeferredReason.trim(),
                        touchedDeferFields: false,
                      };
                    })
                  }
                />
              </div>
            );
          })}
        </section>
      </div>
    </SlideShell>
  );
}
