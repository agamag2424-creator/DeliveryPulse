"use client";

import type { ReportInput, SlideData } from "@/types/report";

import { MilestoneGantt } from "@/components/slides/MilestoneGantt";
import { RAGBadge } from "@/components/slides/RAGBadge";
import { SlideShell } from "@/components/slides/SlideShell";
import { SlideTitle } from "@/components/slides/SlideTitle";
import { TimelineProgress } from "@/components/slides/TimelineProgress";

interface Slide1Props {
  reportInput: ReportInput;
  reportOutput: SlideData;
}

function computeTimelineDays(reportInput: ReportInput) {
  const start = new Date(reportInput.commercialData.engagementStart);
  const end = new Date(reportInput.commercialData.engagementEnd);
  const current = new Date(reportInput.projectData.reportingPeriodTo);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { elapsedDays: 0, totalDays: 0, elapsedPercent: 0 };
  }

  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  const clampedCurrent = current < start ? start : current > end ? end : current;
  const elapsedDays = Math.max(
    0,
    Math.ceil((clampedCurrent.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
  );
  const elapsedPercent = Math.round((elapsedDays / totalDays) * 100);

  return { elapsedDays, totalDays, elapsedPercent };
}

export function Slide1({ reportInput, reportOutput }: Slide1Props) {
  const { elapsedDays, totalDays, elapsedPercent } = computeTimelineDays(reportInput);
  const budgetBurn = reportInput.healthData.currentBudgetBurnPercent;
  const budgetColor = budgetBurn > 90 ? "text-rag-red" : budgetBurn > 70 ? "text-rag-amber" : "text-rag-green";
  const scopeCompletion = reportInput.healthData.currentScopeCompletionPercent;
  const scopeColor = scopeCompletion < 50 ? "text-rag-red" : scopeCompletion < 75 ? "text-rag-amber" : "text-rag-green";
  const scheduleVariance = reportOutput.schedule_variance_days;
  const scheduleValue =
    scheduleVariance === 0 ? "On Track" : `${scheduleVariance > 0 ? "+" : ""}${scheduleVariance}d`;
  const scheduleColor = scheduleVariance > 0 ? "text-rag-red" : "text-rag-green";
  const scheduleNarrative = reportOutput.schedule_variance_narrative.slice(0, 40);

  const normalizedProjectName = reportInput.projectData.projectName
    .replace(/—/g, " — ")
    .replace(/\s+/g, " ")
    .trim();
  return (
    <SlideShell slideNumber={1} totalSlides={6}>
      <div className="grid gap-4">
        <SlideTitle title="Slide 1 - Project Identity & RAG" />
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="space-y-2 lg:col-span-3">
            <p className="break-words text-xl font-bold text-white md:text-3xl">{normalizedProjectName}</p>
            <p className="text-base text-gray-400 md:text-lg">{reportInput.projectData.clientName}</p>
            <p className="text-sm text-gray-500">
              {reportInput.projectData.reportingPeriodFrom} to {reportInput.projectData.reportingPeriodTo} |{" "}
              {reportInput.projectData.deliveryPMName} | {reportInput.projectData.currentProjectPhase}
            </p>
          </div>
          <div className="flex justify-start lg:col-span-2 lg:justify-end">
            <RAGBadge
              status={reportOutput.rag_status}
              reason={reportOutput.rag_reason}
              size="large"
              isManualOverride={reportOutput.rag_status !== reportOutput.rag_ai_suggested}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-lg bg-[#111827] p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">Budget Burn</p>
            <p className={`text-2xl font-bold ${budgetColor}`}>{budgetBurn}%</p>
            <p className="text-xs text-gray-500">of contract consumed</p>
          </article>
          <article className="rounded-lg bg-[#111827] p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">Schedule Variance</p>
            <p className={`text-2xl font-bold ${scheduleColor}`}>{scheduleValue}</p>
            <p className="truncate text-xs text-gray-500" title={reportOutput.schedule_variance_narrative}>
              {scheduleNarrative}
            </p>
          </article>
          <article className="rounded-lg bg-[#111827] p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">Scope Complete</p>
            <p className={`text-2xl font-bold ${scopeColor}`}>{scopeCompletion}%</p>
            <p className="text-xs text-gray-500">deliverables completed</p>
          </article>
          <article className="rounded-lg bg-[#111827] p-4">
            <TimelineProgress
              elapsedPercent={elapsedPercent}
              scopePercent={reportInput.healthData.currentScopeCompletionPercent}
              elapsedDays={elapsedDays}
              totalDays={totalDays}
              rag={reportOutput.rag_status}
            />
          </article>
        </div>

        <div>
          <MilestoneGantt milestones={reportInput.milestones} />
        </div>
      </div>
    </SlideShell>
  );
}
