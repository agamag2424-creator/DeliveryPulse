// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.

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

export default function ReportPage() {
  const router = useRouter();
  const { hasGeneratedInput, reportInput, reportOutput, setReportOutput } = useReportContext();
  const [isPresenting, setIsPresenting] = useState(false);

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
    <main id="print-root" className="min-h-screen bg-background-primary px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 rounded-panel border border-border bg-background-card p-4 md:p-6">
        <h1 className="no-print text-2xl font-semibold text-text-primary">Report</h1>
        <p className="no-print text-sm text-text-secondary">
          Report and presentation page shell for upcoming slides.
        </p>
        {reportOutput ? (
          <div className="no-print rounded-lg border border-border bg-background-elevated p-4">
            <p className="text-sm font-semibold text-text-primary">
              Loaded AI output: {reportOutput.rag_status} ({reportOutput.rag_reason})
            </p>
          </div>
        ) : (
          <p className="text-sm text-rag-amber">Report output not available yet.</p>
        )}
        {reportOutput ? <div id="report-slides-root" className="space-y-4">{slides}</div> : null}
        <div className="no-print flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPresenting(true)}
            className="rounded-[3px] border border-cyan bg-cyan/10 px-4 py-2 text-sm font-semibold text-cyan-strong hover:bg-cyan/20"
          >
            ▶ Present
          </button>
          <Link
            className="w-fit rounded-[3px] border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-faint"
            href="/input"
          >
            Back to Input
          </Link>
        </div>
      </div>
    </main>
  );
}
