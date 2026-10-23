// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.

"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { RAGStatus } from "@/types/report";

interface CapacityRow {
  workstreamName: string;
  planned: number;
  actual: number;
  capacityRag: RAGStatus;
}

interface CapacityChartProps {
  rows: CapacityRow[];
}

function shortName(name: string) {
  return name.length > 8 ? `${name.slice(0, 8)}…` : name;
}

function ragColor(status: RAGStatus) {
  if (status === "GREEN") return "#10B981";
  if (status === "AMBER") return "#F59E0B";
  return "#EF4444";
}

export function CapacityChart({ rows }: CapacityChartProps) {
  const fullyStaffed = rows.every((row) => row.actual === row.planned);
  const maxPlanned = rows.reduce((max, row) => Math.max(max, row.planned), 0);
  const chartData = rows.map((row) => ({
    name: shortName(row.workstreamName),
    fullName: row.workstreamName,
    planned: row.planned,
    actual: row.actual,
    capacityRag: row.capacityRag,
  }));

  return (
    <section className="h-full">
      <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">Team Capacity - Planned vs Actual</p>
      {fullyStaffed ? (
        <p className="mb-2 w-fit rounded bg-green-500/10 px-3 py-1 text-xs text-green-400">
          ✅ All workstreams fully staffed this week
        </p>
      ) : null}
      <div className="h-[180px] rounded-xl bg-[#111827] p-3 md:h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={14} barGap={2} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="rgba(55,65,81,0.4)" />
            <XAxis dataKey="name" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
            <YAxis domain={[0, maxPlanned + 1]} allowDecimals={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
            <Tooltip
              formatter={(value, name, entry) => [
                `${String(name).toLowerCase() === "planned" ? "Planned" : "Actual"} ${Number(value ?? 0)}`,
                (entry.payload as { fullName: string }).fullName,
              ]}
              contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
              labelStyle={{ color: "#F9FAFB" }}
            />
            <Legend iconSize={8} />
            <Bar dataKey="planned" name="Planned" fill="#374151" />
            <Bar dataKey="actual" name="Actual">
              {chartData.map((entry) => (
                <Cell key={entry.fullName} fill={ragColor(entry.capacityRag)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export type { CapacityRow };
