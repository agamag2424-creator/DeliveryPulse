"use client";

import type { ReportInput, SlideData } from "@/types/report";

import { ExecutiveSummaryPanel } from "@/components/slides/ExecutiveSummaryPanel";
import { ForecastSignalsPanel } from "@/components/slides/ForecastSignalsPanel";
import { HighlightsPanel } from "@/components/slides/HighlightsPanel";
import { SlideShell } from "@/components/slides/SlideShell";
import { SlideTitle } from "@/components/slides/SlideTitle";
import { TrendForecastChart } from "@/components/slides/TrendForecastChart";

interface Slide2Props {
  reportInput: ReportInput;
  reportOutput: SlideData;
  onReportOutputChange: (updater: (prev: SlideData) => SlideData) => void;
}

export function Slide2({ reportInput, reportOutput, onReportOutputChange }: Slide2Props) {
  return (
    <SlideShell slideNumber={2} totalSlides={6}>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12">
          <SlideTitle title="Slide 2 - Executive Summary & Forecast" />
        </div>
        <div className="lg:col-span-12">
          <ExecutiveSummaryPanel
            value={reportOutput.executive_summary}
            originalValue={reportOutput.executive_summary}
            onChange={(value) =>
              onReportOutputChange((prev) => ({
                ...prev,
                executive_summary: value,
              }))
            }
          />
        </div>

        <div className="lg:col-span-12">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="flex min-h-[460px] flex-col gap-4 lg:col-span-5">
              <div className="flex-1">
                <HighlightsPanel
                  wins={reportOutput.highlights_wins}
                  concerns={reportOutput.highlights_concerns}
                  onWinsChange={(items) =>
                    onReportOutputChange((prev) => ({
                      ...prev,
                      highlights_wins: items.slice(0, 4),
                    }))
                  }
                  onConcernsChange={(items) =>
                    onReportOutputChange((prev) => ({
                      ...prev,
                      highlights_concerns: items.slice(0, 4),
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex min-h-[460px] flex-col gap-4 lg:col-span-7">
              <div className="flex-1">
                <TrendForecastChart reportInput={reportInput} forecast={reportOutput.forecast} />
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-12">
          <ForecastSignalsPanel forecast={reportOutput.forecast} />
        </div>
      </div>
    </SlideShell>
  );
}
