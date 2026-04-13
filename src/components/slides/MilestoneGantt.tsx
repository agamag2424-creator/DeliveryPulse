"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { Milestone } from "@/types/report";

interface MilestoneGanttProps {
  milestones: Milestone[];
}

interface MilestoneRow {
  name: string;
  baselineRange: [number, number];
  forecastRange: [number, number];
  varianceDays: number;
  status: Milestone["status"];
  baselineDate: string;
  forecastDate: string;
  ragColor: string;
}

const dayMs = 24 * 60 * 60 * 1000;

function truncateLabel(label: string, limit = 28) {
  if (label.length <= limit) {
    return label;
  }
  return `${label.slice(0, limit - 1)}…`;
}

function formatDateForTooltip(value: string) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function MilestoneTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: MilestoneRow }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const milestone = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-background-card p-3 text-xs text-text-secondary shadow-lg">
      <p className="font-semibold text-text-primary">{milestone.name}</p>
      <p>Baseline: {formatDateForTooltip(milestone.baselineDate)}</p>
      <p>Forecast: {formatDateForTooltip(milestone.forecastDate)}</p>
      <p className={milestone.varianceDays > 0 ? "text-rag-red" : "text-rag-green"}>
        Variance: {milestone.varianceDays > 0 ? `+${milestone.varianceDays} days` : "On track"}
      </p>
      <p>Status: {milestone.status}</p>
    </div>
  );
}

export function MilestoneGantt({ milestones }: MilestoneGanttProps) {
  const [todayTs] = useState(() => Date.now());
  const { chartData, minTs, maxTs } = useMemo(() => {
    if (!milestones.length) {
      return { chartData: [] as MilestoneRow[], minTs: 0, maxTs: dayMs };
    }

    const allDates = milestones
      .flatMap((milestone) => [milestone.baselineDate, milestone.forecastDate])
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const minDate = allDates[0] ?? new Date();
    const maxDate = allDates[allDates.length - 1] ?? new Date();

    const rows = milestones.map<MilestoneRow>((milestone) => {
      const baseline = new Date(milestone.baselineDate);
      const forecast = new Date(milestone.forecastDate);
      const baselineTs = baseline.getTime();
      const forecastTs = forecast.getTime();
      const varianceDays = Math.round((forecastTs - baselineTs) / dayMs);
      const isComplete = milestone.status === "Complete";

      let ragColor = "#10B981";
      if (isComplete) {
        ragColor = "#6B7280";
      } else if (varianceDays > 7) {
        ragColor = "#EF4444";
      } else if (varianceDays >= 1) {
        ragColor = "#F59E0B";
      }

      return {
        name: truncateLabel(milestone.milestoneName),
        baselineRange: [baselineTs, baselineTs + dayMs],
        forecastRange: [baselineTs, forecastTs],
        varianceDays,
        status: milestone.status,
        baselineDate: milestone.baselineDate,
        forecastDate: milestone.forecastDate,
        ragColor
      };
    });

    return {
      chartData: rows,
      minTs: minDate.getTime(),
      maxTs: maxDate.getTime() + dayMs * 7,
    };
  }, [milestones]);

  if (!chartData.length) {
    return (
      <div className="rounded-xl border border-border bg-background-card p-4 text-sm text-text-secondary">
        Add milestones to render the baseline vs forecast chart.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-background-card p-4">
      <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">Milestone Tracker</p>
      <div className="min-w-[760px]">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 160 }}>
            <CartesianGrid stroke="#374151" strokeDasharray="3 3" vertical={false} />
            <XAxis
              type="number"
              domain={[minTs, maxTs]}
              tick={{ fill: "#9CA3AF", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) =>
                new Date(val).toLocaleDateString(undefined, { month: "short", day: "numeric" })
              }
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#D1D5DB", fontSize: 11 }}
              width={155}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip cursor={{ fill: "rgba(59,130,246,0.10)" }} content={<MilestoneTooltip />} />
            <ReferenceLine
              x={todayTs}
              stroke="#3B82F6"
              strokeDasharray="4 4"
              label={{ value: "Today", fill: "#3B82F6", fontSize: 11 }}
            />
            <Bar dataKey="baselineRange" barSize={6} fill="rgba(107,114,128,0.3)" radius={[2, 2, 2, 2]} />
            <Bar
              dataKey="forecastRange"
              barSize={14}
              radius={[3, 3, 3, 3]}
              fill="#3B82F6"
              label={(props) => {
                const row = props.payload as MilestoneRow | undefined;
                if (!row || row.status !== "Complete") return null;
                const x = typeof props.x === "number" ? props.x : 0;
                const y = typeof props.y === "number" ? props.y : 0;
                const width = typeof props.width === "number" ? props.width : 0;
                return (
                  <text x={x + width + 4} y={y + 10} fill="#9CA3AF">
                    ✓
                  </text>
                );
              }}
              shape={(props) => {
                const row = props.payload as MilestoneRow;
                return (
                  <rect
                    x={props.x}
                    y={props.y}
                    width={props.width}
                    height={props.height}
                    fill={row.ragColor}
                    rx={6}
                    ry={6}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
