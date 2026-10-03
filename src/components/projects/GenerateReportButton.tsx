"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { QuotaLimitNotice } from "@/components/usage/QuotaLimitNotice";
import { saveGapFillSession } from "@/lib/agent/gapFillSession";
import type { AgentResumeState, CompletenessReport, Gap } from "@/lib/agent/types";
import { isQuotaExceededPayload } from "@/lib/usage/constants";
import type { ReportInput } from "@/types/report";

interface GenerateReportButtonProps {
  projectId: string;
  className?: string;
}

export function GenerateReportButton({ projectId, className }: GenerateReportButtonProps) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  async function handleGenerate() {
    setIsRunning(true);
    setError(null);
    setQuotaExceeded(false);

    try {
      const statusRes = await fetch(`/api/connectors/status?projectId=${projectId}`);
      const statusPayload = (await statusRes.json()) as {
        anyActive?: boolean;
      };

      if (!statusPayload.anyActive) {
        router.push(`/input?projectId=${projectId}&manual=true`);
        return;
      }

      const runRes = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const payload = (await runRes.json()) as {
        status: string;
        gaps?: Gap[];
        partialInput?: Partial<ReportInput>;
        completeness?: CompletenessReport;
        agentState?: AgentResumeState;
        reportId?: string;
        error?: string;
        code?: string;
        upgradePath?: string;
      };

      if (isQuotaExceededPayload(payload, runRes.status)) {
        setQuotaExceeded(true);
        setError(payload.error ?? "Free plan limit reached. Upgrade to Pro to generate more.");
        return;
      }

      if (payload.status === "GAPS" && payload.agentState && payload.gaps && payload.completeness) {
        saveGapFillSession(projectId, {
          agentState: payload.agentState,
          gaps: payload.gaps,
          partialInput: payload.partialInput ?? {},
          completeness: payload.completeness,
          jiraConnected: true,
        });
        router.push(`/projects/${projectId}/gap-fill`);
        return;
      }

      if (payload.status === "COMPLETE" && payload.reportId) {
        router.push(`/projects/${projectId}/reports/${payload.reportId}`);
        return;
      }

      setError(payload.error ?? "Report generation failed");
    } catch {
      setError("Report generation failed");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={isRunning}
        className={className ?? "rounded-[3px] bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:bg-black disabled:opacity-60"}
      >
        {isRunning ? "Generating…" : "Generate Report"}
      </button>
      {quotaExceeded && error ? (
        <QuotaLimitNotice message={error} className="max-w-xs text-right text-xs text-rag-amber" />
      ) : error ? (
        <p className="max-w-xs text-right text-xs text-rag-red">
          {error}.{" "}
          <Link href={`/input?projectId=${projectId}&manual=true`} className="underline">
            Enter manually
          </Link>
        </p>
      ) : null}
    </div>
  );
}
