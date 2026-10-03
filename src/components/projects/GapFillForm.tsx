"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { FormInput } from "@/components/form/FormInput";
import { ReportFlowProgress } from "@/components/reports/ReportFlowProgress";
import { QuotaLimitNotice } from "@/components/usage/QuotaLimitNotice";
import { clearGapFillSession, type GapFillSession } from "@/lib/agent/gapFillSession";
import type { Gap } from "@/lib/agent/types";
import { isQuotaExceededPayload } from "@/lib/usage/constants";
import type { Milestone, ReportInput } from "@/types/report";

interface GapFillFormProps {
  projectId: string;
  projectName: string;
  session: GapFillSession;
}

function criticalGaps(gaps: Gap[]): Gap[] {
  return gaps.filter((gap) => gap.isCritical);
}

function nonCriticalGaps(gaps: Gap[]): Gap[] {
  return gaps.filter((gap) => !gap.isCritical);
}

export function GapFillForm({ projectId, projectName, session }: GapFillFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [milestones, setMilestones] = useState<Milestone[]>(
    session.partialInput.milestones?.length
      ? session.partialInput.milestones
      : [
          { milestoneName: "", baselineDate: "", forecastDate: "", status: "Not Started", owner: "" },
          { milestoneName: "", baselineDate: "", forecastDate: "", status: "Not Started", owner: "" },
          { milestoneName: "", baselineDate: "", forecastDate: "", status: "Not Started", owner: "" },
        ],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const critical = useMemo(() => criticalGaps(session.gaps), [session.gaps]);
  const optional = useMemo(() => nonCriticalGaps(session.gaps), [session.gaps]);

  const freeTextValue = answers.freeTextDump ?? answers.context ?? "";
  const freeTextLength = freeTextValue.trim().length;

  function setAnswer(field: string, value: string) {
    setAnswers((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setQuotaExceeded(false);

    const pmAnswers: Record<string, string> = { ...answers };
    if (critical.some((gap) => gap.field === "milestones")) {
      pmAnswers.milestones = JSON.stringify(milestones);
    }
    if (critical.some((gap) => gap.field === "freeTextDump") && !pmAnswers.freeTextDump) {
      pmAnswers.freeTextDump = freeTextValue;
    }

    try {
      const response = await fetch("/api/agent/gaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          pmAnswers,
          agentState: session.agentState,
        }),
      });

      const payload = (await response.json()) as {
        status: string;
        reportId?: string;
        error?: string;
        code?: string;
      };

      if (isQuotaExceededPayload(payload, response.status)) {
        setQuotaExceeded(true);
        setError(payload.error ?? "Free plan limit reached. Upgrade to Pro to generate more.");
        return;
      }

      if (payload.status === "COMPLETE" && payload.reportId) {
        clearGapFillSession(projectId);
        router.push(`/projects/${projectId}/reports/${payload.reportId}`);
        return;
      }

      setError(payload.error ?? "Failed to generate report");
    } catch {
      setError("Failed to generate report");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <ReportFlowProgress
        activeStep={2}
        jiraLabel={session.jiraConnected ? "Jira ✓ | Manual gaps pending" : undefined}
      />

      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          Almost ready — {critical.length} thing{critical.length === 1 ? "" : "s"} needed
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {session.jiraConnected
            ? "I pulled your Jira data successfully. I just need a few things I couldn't find:"
            : `Complete the missing fields for ${projectName}.`}
        </p>
      </div>

      {session.partialInput.workstreams?.[0] ? (
        <div className="rounded-lg border border-rag-green/40 bg-rag-green/10 px-4 py-3 text-sm text-rag-green">
          From Jira: {session.partialInput.workstreams[0].tasksCompleted}/
          {session.partialInput.workstreams[0].tasksPlanned} tasks complete in{" "}
          {session.partialInput.workstreams[0].workstreamName || "current sprint"}
        </div>
      ) : null}

      {quotaExceeded && error ? (
        <QuotaLimitNotice message={error} />
      ) : error ? (
        <div className="rounded-lg border border-rag-red/40 bg-rag-red/10 px-4 py-3 text-sm text-rag-red">{error}</div>
      ) : null}

      <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
        {critical.map((gap, index) => (
          <div key={gap.field} className="space-y-2 rounded-panel border border-border bg-background-card p-4">
            <p className="text-sm font-medium text-text-primary">
              {index + 1}. {gap.label}
            </p>
            <p className="text-xs text-text-muted">{gap.reason}</p>

            {gap.field === "healthData.currentBudgetBurnPercent" ? (
              <FormInput
                id={gap.field}
                label="Budget burn %"
                type="number"
                mandatory
                value={answers[gap.field] ?? ""}
                onChange={(event) => setAnswer(gap.field, event.target.value)}
              />
            ) : null}

            {gap.field === "projectData.deliveryPMName" ? (
              <FormInput
                id={gap.field}
                label="Delivery PM name"
                mandatory
                value={answers[gap.field] ?? ""}
                onChange={(event) => setAnswer(gap.field, event.target.value)}
              />
            ) : null}

            {gap.field === "milestones" ? (
              <div className="mt-3 space-y-3">
                {milestones.slice(0, 3).map((milestone, rowIndex) => (
                  <div key={rowIndex} className="grid gap-2 md:grid-cols-3">
                    <FormInput
                      id={`milestone-name-${rowIndex}`}
                      label={`Milestone ${rowIndex + 1}`}
                      value={milestone.milestoneName}
                      onChange={(event) => {
                        const next = [...milestones];
                        next[rowIndex] = { ...next[rowIndex], milestoneName: event.target.value };
                        setMilestones(next);
                      }}
                    />
                    <FormInput
                      id={`milestone-baseline-${rowIndex}`}
                      label="Baseline"
                      type="date"
                      value={milestone.baselineDate}
                      onChange={(event) => {
                        const next = [...milestones];
                        next[rowIndex] = { ...next[rowIndex], baselineDate: event.target.value };
                        setMilestones(next);
                      }}
                    />
                    <FormInput
                      id={`milestone-forecast-${rowIndex}`}
                      label="Forecast"
                      type="date"
                      value={milestone.forecastDate}
                      onChange={(event) => {
                        const next = [...milestones];
                        next[rowIndex] = { ...next[rowIndex], forecastDate: event.target.value };
                        setMilestones(next);
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {gap.field === "freeTextDump" ? (
              <div className="mt-3 space-y-2">
                <label htmlFor="freeTextDump" className="text-sm text-text-secondary">
                  Any context I should know about (what happened this week, blockers, decisions made)
                </label>
                <textarea
                  id="freeTextDump"
                  rows={5}
                  className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
                  value={freeTextValue}
                  onChange={(event) => setAnswer("freeTextDump", event.target.value)}
                />
                <p className={`text-xs ${freeTextLength >= 50 ? "text-rag-green" : "text-text-muted"}`}>
                  {freeTextLength}/50 characters minimum
                </p>
              </div>
            ) : null}

            {!["healthData.currentBudgetBurnPercent", "projectData.deliveryPMName", "milestones", "freeTextDump"].includes(
              gap.field,
            ) ? (
              <FormInput
                id={gap.field}
                label={gap.label}
                value={answers[gap.field] ?? ""}
                onChange={(event) => setAnswer(gap.field, event.target.value)}
              />
            ) : null}
          </div>
        ))}

        {optional.length > 0 ? (
          <p className="text-sm text-text-muted">
            I&apos;ll use what I have for {optional.length} optional field{optional.length === 1 ? "" : "s"} — you can add
            more next week.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-[3px] bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:bg-black disabled:opacity-60"
        >
          {isSubmitting ? "Generating…" : "Generate Report →"}
        </button>
      </form>
    </div>
  );
}
