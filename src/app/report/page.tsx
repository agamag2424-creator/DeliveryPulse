"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PresentationMode } from "@/components/presentation/PresentationMode";
import { Slide1 } from "@/components/slides/Slide1";
import { Slide2 } from "@/components/slides/Slide2";
import { Slide3 } from "@/components/slides/Slide3";
import { Slide4 } from "@/components/slides/Slide4";
import { Slide5 } from "@/components/slides/Slide5";
import { Slide6 } from "@/components/slides/Slide6";
import { useReportContext } from "@/context/ReportContext";
import { exportReportPDF } from "@/lib/exportPDF";

export default function ReportPage() {
  const router = useRouter();
  const { hasGeneratedInput, reportInput, reportOutput, setReportOutput } = useReportContext();
  const [isPresenting, setIsPresenting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    if (!hasGeneratedInput) {
      router.replace("/input");
    }
  }, [hasGeneratedInput, router]);

  const slides = useMemo(() => {
    if (!reportOutput) return [];
    return [
      <Slide1 key="slide-1" reportInput={reportInput} reportOutput={reportOutput} />,
      <Slide2
        key="slide-2"
        reportInput={reportInput}
        reportOutput={reportOutput}
        onReportOutputChange={(updater) => {
          setReportOutput((prev) => (prev ? updater(prev) : prev));
        }}
      />,
      <Slide3 key="slide-3" reportInput={reportInput} reportOutput={reportOutput} />,
      <Slide4 key="slide-4" reportInput={reportInput} reportOutput={reportOutput} />,
      <Slide5 key="slide-5" reportInput={reportInput} reportOutput={reportOutput} />,
      <Slide6 key="slide-6" reportInput={reportInput} reportOutput={reportOutput} />,
    ];
  }, [reportInput, reportOutput, setReportOutput]);

  if (!hasGeneratedInput) {
    return null;
  }

  if (isPresenting && slides.length) {
    return (
      <PresentationMode
        slides={slides}
        slideTitles={[
          "Project Identity & RAG",
          "Executive Summary & Forecast",
          "Workstream Execution Health",
          "RAID Intelligence Dashboard",
          "Commercial & Financial Health",
          "Decisions Required",
        ]}
        onExit={() => setIsPresenting(false)}
      />
    );
  }

  return (
    <main className="min-h-screen bg-background-primary px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 rounded-xl border border-border bg-background-card p-4 md:p-6">
        <h1 className="text-2xl font-semibold text-text-primary">Report</h1>
        <p className="text-sm text-text-secondary">
          Report and presentation page shell for upcoming slides.
        </p>
        {reportOutput ? (
          <div className="rounded-lg border border-border bg-background-elevated p-4">
            <p className="text-sm font-semibold text-text-primary">
              Loaded AI output: {reportOutput.rag_status} ({reportOutput.rag_reason})
            </p>
          </div>
        ) : (
          <p className="text-sm text-rag-amber">Report output not available yet.</p>
        )}
        {reportOutput ? <div id="report-slides-root" className="space-y-4">{slides}</div> : null}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPresenting(true)}
            className="rounded-lg border border-accent-blue bg-accent-blue/20 px-4 py-2 text-sm font-semibold text-accent-blue hover:bg-accent-blue/30"
          >
            ▶ Present
          </button>
          <button
            type="button"
            disabled={isExportingPdf || !reportOutput}
            onClick={async () => {
              if (!reportOutput) return;
              try {
                setIsExportingPdf(true);
                await exportReportPDF({
                  projectName: reportInput.projectData.projectName,
                  reportingPeriodFrom: reportInput.projectData.reportingPeriodFrom,
                  reportingPeriodTo: reportInput.projectData.reportingPeriodTo,
                });
              } finally {
                setIsExportingPdf(false);
              }
            }}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-primary hover:bg-background-elevated disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExportingPdf ? "Generating PDF..." : "⬇ Export PDF"}
          </button>
          <Link
            className="w-fit rounded-lg border border-border px-4 py-2 text-sm text-text-primary hover:bg-background-elevated"
            href="/input"
          >
            Back to Input
          </Link>
        </div>
      </div>
    </main>
  );
}
