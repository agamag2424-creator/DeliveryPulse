"use client";

import type { ReportInput, SlideData } from "@/types/report";

import { BlockerDetailPanel, type BlockerDetailItem } from "@/components/slides/BlockerDetailPanel";
import { CapacityChart, type CapacityRow } from "@/components/slides/CapacityChart";
import { SlideShell } from "@/components/slides/SlideShell";
import { SlideTitle } from "@/components/slides/SlideTitle";
import { WorkstreamScorecard, type WorkstreamScoreRow } from "@/components/slides/WorkstreamScorecard";

interface Slide3Props {
  reportInput: ReportInput;
  reportOutput: SlideData;
}

function buildScoreRows(reportInput: ReportInput, reportOutput: SlideData): WorkstreamScoreRow[] {
  const byName = new Map(reportOutput.workstream_analysis.map((row) => [row.workstream_name, row]));

  return reportInput.workstreams.map((workstream, index) => {
    const analysis = byName.get(workstream.workstreamName) ?? reportOutput.workstream_analysis[index];
    return {
      workstreamName: workstream.workstreamName,
      overallRag: analysis?.overall_rag ?? "AMBER",
      tasksCompleted: workstream.tasksCompleted,
      tasksPlanned: workstream.tasksPlanned,
      blockerCount: analysis?.blocker_count ?? 0,
      blockerType: analysis?.blocker_type ?? "none",
      actualTeam: workstream.actualTeamSize,
      plannedTeam: workstream.plannedTeamSize,
      dependencyRag: analysis?.dependency_rag ?? "AMBER",
    };
  });
}

function buildBlockers(reportOutput: SlideData): BlockerDetailItem[] {
  return reportOutput.workstream_analysis.flatMap((workstream) =>
    workstream.blocker_details.map((blocker) => ({
      workstream: workstream.workstream_name,
      description: blocker.description,
      type: blocker.type,
      daysOpen: blocker.days_open ?? 0,
      owner: blocker.owner || "Unassigned",
      impact: blocker.impact || "Not specified",
    })),
  );
}

function buildCapacityRows(reportInput: ReportInput, reportOutput: SlideData): CapacityRow[] {
  const byName = new Map(reportOutput.workstream_analysis.map((row) => [row.workstream_name, row]));
  return reportInput.workstreams.map((workstream, index) => {
    const analysis = byName.get(workstream.workstreamName) ?? reportOutput.workstream_analysis[index];
    return {
      workstreamName: workstream.workstreamName,
      planned: workstream.plannedTeamSize,
      actual: workstream.actualTeamSize,
      capacityRag: analysis?.capacity_rag ?? "AMBER",
    };
  });
}

export function Slide3({ reportInput, reportOutput }: Slide3Props) {
  const scoreRows = buildScoreRows(reportInput, reportOutput);
  const blockers = buildBlockers(reportOutput);
  const capacityRows = buildCapacityRows(reportInput, reportOutput);

  return (
    <SlideShell slideNumber={3} totalSlides={6}>
      <div className="grid gap-4">
        <SlideTitle title="Slide 3 - Workstream Execution Health" />
        <div className="min-h-[300px]">
          <WorkstreamScorecard rows={scoreRows} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="min-h-[240px] rounded-xl bg-[#0F172A]/30 p-3">
            <BlockerDetailPanel blockers={blockers} />
          </div>
          <div className="min-h-[240px] rounded-xl bg-[#0F172A]/30 p-3">
            <CapacityChart rows={capacityRows} />
          </div>
        </div>
      </div>
    </SlideShell>
  );
}
