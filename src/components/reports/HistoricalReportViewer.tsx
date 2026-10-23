"use client";

import Link from "next/link";

import { ReportSlideDeck } from "@/components/reports/ReportSlideDeck";
import type { ReportInput, SlideData } from "@/types/report";

interface HistoricalReportViewerProps {
  projectId: string;
  weekLabel: string;
  reportInput: ReportInput;
  reportOutput: SlideData;
}

export function HistoricalReportViewer({
  projectId,
  weekLabel,
  reportInput,
  reportOutput,
}: HistoricalReportViewerProps) {
  return (
    <main id="print-root" className="min-h-screen bg-background-primary px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 rounded-panel border border-border bg-background-card p-4 md:p-6">
        <div className="no-print flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href={`/projects/${projectId}`} className="text-sm text-text-muted hover:text-text-primary">
              ← Back to project
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-text-primary">Historical Report</h1>
          </div>
          <span className="rounded-full border border-border bg-background-elevated px-3 py-1 text-xs font-medium text-text-muted">
            Historical Report — {weekLabel}
          </span>
        </div>
        <ReportSlideDeck reportInput={reportInput} reportOutput={reportOutput} readOnly />
      </div>
    </main>
  );
}
