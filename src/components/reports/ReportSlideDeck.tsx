"use client";

import { useMemo, useState } from "react";

import { PresentationMode } from "@/components/presentation/PresentationMode";
import { Slide1 } from "@/components/slides/Slide1";
import { Slide2 } from "@/components/slides/Slide2";
import { Slide3 } from "@/components/slides/Slide3";
import { Slide4 } from "@/components/slides/Slide4";
import { Slide5 } from "@/components/slides/Slide5";
import { Slide6 } from "@/components/slides/Slide6";
import type { ReportInput, SlideData } from "@/types/report";

interface ReportSlideDeckProps {
  reportInput: ReportInput;
  reportOutput: SlideData;
  readOnly?: boolean;
}

const SLIDE_TITLES = [
  "Project Identity & RAG",
  "Executive Summary & Forecast",
  "Workstream Execution Health",
  "RAID Intelligence Dashboard",
  "Commercial & Financial Health",
  "Decisions Required",
];

export function ReportSlideDeck({ reportInput, reportOutput, readOnly = false }: ReportSlideDeckProps) {
  const [output, setOutput] = useState(reportOutput);
  const [isPresenting, setIsPresenting] = useState(false);

  const slides = useMemo(
    () => [
      <Slide1 key="slide-1" reportInput={reportInput} reportOutput={output} />,
      <Slide2
        key="slide-2"
        reportInput={reportInput}
        reportOutput={output}
        onReportOutputChange={(updater) => {
          if (!readOnly) {
            setOutput((prev) => updater(prev));
          }
        }}
      />,
      <Slide3 key="slide-3" reportInput={reportInput} reportOutput={output} />,
      <Slide4 key="slide-4" reportInput={reportInput} reportOutput={output} />,
      <Slide5 key="slide-5" reportInput={reportInput} reportOutput={output} />,
      <Slide6 key="slide-6" reportInput={reportInput} reportOutput={output} />,
    ],
    [reportInput, output, readOnly],
  );

  if (isPresenting) {
    return <PresentationMode slides={slides} slideTitles={SLIDE_TITLES} onExit={() => setIsPresenting(false)} />;
  }

  return (
    <>
      <div id="report-slides-root" className="space-y-4">
        {slides}
      </div>
      <div className="no-print mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsPresenting(true)}
          className="rounded-[3px] border border-cyan bg-cyan/10 px-4 py-2 text-sm font-semibold text-cyan-strong hover:bg-cyan/20"
        >
          ▶ Present
        </button>
      </div>
    </>
  );
}
