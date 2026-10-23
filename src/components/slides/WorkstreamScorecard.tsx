// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.

import type { RAGStatus } from "@/types/report";

import { RAGBadge } from "@/components/slides/RAGBadge";
import { VelocityBar } from "@/components/slides/VelocityBar";

export interface WorkstreamScoreRow {
  workstreamName: string;
  overallRag: RAGStatus;
  tasksCompleted: number;
  tasksPlanned: number;
  blockerCount: number;
  blockerType: "none" | "internal" | "external";
  actualTeam: number;
  plannedTeam: number;
  dependencyRag: RAGStatus;
}

interface WorkstreamScorecardProps {
  rows: WorkstreamScoreRow[];
}

function truncate(name: string, max = 22) {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

export function WorkstreamScorecard({ rows }: WorkstreamScorecardProps) {
  return (
    <section className="space-y-0">
      <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">Workstream Execution Health</p>

      <div className="overflow-x-auto rounded-xl">
        <table className="min-w-[560px] w-full overflow-hidden rounded-xl bg-[#111827]">
          <thead className="bg-[#1F2937] text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="w-[20%] px-2 py-3 text-left font-semibold">Workstream</th>
              <th className="w-[12%] px-2 py-3 text-center font-semibold">Overall RAG</th>
              <th className="w-[24%] px-2 py-3 text-center font-semibold">Velocity</th>
              <th className="w-[12%] px-2 py-3 text-center font-semibold">Blockers</th>
              <th className="w-[13%] px-2 py-3 text-center font-semibold">Capacity</th>
              <th className="w-[13%] px-2 py-3 text-center font-semibold">Dependencies</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.workstreamName}
                className="border-b border-gray-800 transition-colors hover:bg-[#1F2937]/50"
              >
                <td className="px-3 py-3 text-sm font-medium text-white" title={row.workstreamName}>
                  {truncate(row.workstreamName)}
                </td>
                <td className="px-3 py-3 text-center align-middle">
                  <RAGBadge status={row.overallRag} reason="" size="mini" />
                </td>
                <td className="px-3 py-3">
                  <VelocityBar tasksCompleted={row.tasksCompleted} tasksPlanned={row.tasksPlanned} />
                </td>
                <td className="px-3 py-3 text-center">
                  {row.blockerCount === 0 ? (
                    <span className="text-gray-600">—</span>
                  ) : row.blockerType === "internal" ? (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                      {row.blockerCount} int
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                      {row.blockerCount} ext
                    </span>
                  )}
                </td>
                <td
                  className={`px-3 py-3 text-center text-sm ${
                    row.actualTeam < row.plannedTeam ? "text-amber-400" : "text-green-400"
                  }`}
                >
                  {row.actualTeam}/{row.plannedTeam}
                </td>
                <td className="px-3 py-3 text-center">
                  <RAGBadge status={row.dependencyRag} reason="" size="mini" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-b-xl bg-[#1F2937]/50 px-4 py-2 text-center text-xs text-gray-600">
        RAG Scoring Model: Velocity 30% │ Blockers 30% │ Capacity 20% │ Dependencies 20% │ Blocker age
        threshold: 5 days
      </div>
    </section>
  );
}
