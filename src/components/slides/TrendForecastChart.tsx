// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.

"use client";

import { useMemo, useState } from "react";
import { Area, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ReportInput, SlideData } from "@/types/report";

interface TrendForecastChartProps {
  reportInput: ReportInput;
  forecast: SlideData["forecast"];
}

const metricConfig = {
  budget: { label: "Budget Burn", color: "#3B82F6" },
  scope: { label: "Scope Completion", color: "#10B981" },
  schedule: { label: "Schedule Health", color: "#F59E0B" },
} as const;

export function TrendForecastChart({ reportInput, forecast }: TrendForecastChartProps) {
  const [visibleMetrics, setVisibleMetrics] = useState<Record<keyof typeof metricConfig, boolean>>({
    budget: true,
    scope: true,
    schedule: true,
  });

  const history = reportInput.healthHistory;
  const lastActualWeek = history[history.length - 1]?.weekLabel;

  const data = useMemo(() => {
    const actualRows = history.map((row) => ({
      week: row.weekLabel,
      budget_actual: row.budgetBurnPercent,
      scope_actual: row.scopeCompletionPercent,
      schedule_actual: row.scheduleHealthPercent,
      budget_forecast: null as number | null,
      scope_forecast: null as number | null,
      schedule_forecast: null as number | null,
      budget_band_low: null as number | null,
      budget_band_range: null as number | null,
      scope_band_low: null as number | null,
      scope_band_range: null as number | null,
      schedule_band_low: null as number | null,
      schedule_band_range: null as number | null,
    }));

    const weekPlus1BudgetLow = Math.min(
      forecast.budget_burn.week_plus_1_optimistic,
      forecast.budget_burn.week_plus_1_pessimistic,
    );
    const weekPlus1BudgetHigh = Math.max(
      forecast.budget_burn.week_plus_1_optimistic,
      forecast.budget_burn.week_plus_1_pessimistic,
    );
    const weekPlus2BudgetLow = Math.min(
      forecast.budget_burn.week_plus_2_optimistic,
      forecast.budget_burn.week_plus_2_pessimistic,
    );
    const weekPlus2BudgetHigh = Math.max(
      forecast.budget_burn.week_plus_2_optimistic,
      forecast.budget_burn.week_plus_2_pessimistic,
    );

    const weekPlus1ScopeLow = Math.min(
      forecast.scope_completion.week_plus_1_optimistic,
      forecast.scope_completion.week_plus_1_pessimistic,
    );
    const weekPlus1ScopeHigh = Math.max(
      forecast.scope_completion.week_plus_1_optimistic,
      forecast.scope_completion.week_plus_1_pessimistic,
    );
    const weekPlus2ScopeLow = Math.min(
      forecast.scope_completion.week_plus_2_optimistic,
      forecast.scope_completion.week_plus_2_pessimistic,
    );
    const weekPlus2ScopeHigh = Math.max(
      forecast.scope_completion.week_plus_2_optimistic,
      forecast.scope_completion.week_plus_2_pessimistic,
    );

    const weekPlus1ScheduleLow = Math.min(
      forecast.schedule_health.week_plus_1_optimistic,
      forecast.schedule_health.week_plus_1_pessimistic,
    );
    const weekPlus1ScheduleHigh = Math.max(
      forecast.schedule_health.week_plus_1_optimistic,
      forecast.schedule_health.week_plus_1_pessimistic,
    );
    const weekPlus2ScheduleLow = Math.min(
      forecast.schedule_health.week_plus_2_optimistic,
      forecast.schedule_health.week_plus_2_pessimistic,
    );
    const weekPlus2ScheduleHigh = Math.max(
      forecast.schedule_health.week_plus_2_optimistic,
      forecast.schedule_health.week_plus_2_pessimistic,
    );

    const forecastRows = [
      {
        week: "W+1",
        budget_actual: null,
        scope_actual: null,
        schedule_actual: null,
        budget_forecast: forecast.budget_burn.week_plus_1_base,
        scope_forecast: forecast.scope_completion.week_plus_1_base,
        schedule_forecast: forecast.schedule_health.week_plus_1_base,
        budget_band_low: weekPlus1BudgetLow,
        budget_band_range: weekPlus1BudgetHigh - weekPlus1BudgetLow,
        scope_band_low: weekPlus1ScopeLow,
        scope_band_range: weekPlus1ScopeHigh - weekPlus1ScopeLow,
        schedule_band_low: weekPlus1ScheduleLow,
        schedule_band_range: weekPlus1ScheduleHigh - weekPlus1ScheduleLow,
      },
      {
        week: "W+2",
        budget_actual: null,
        scope_actual: null,
        schedule_actual: null,
        budget_forecast: forecast.budget_burn.week_plus_2_base,
        scope_forecast: forecast.scope_completion.week_plus_2_base,
        schedule_forecast: forecast.schedule_health.week_plus_2_base,
        budget_band_low: weekPlus2BudgetLow,
        budget_band_range: weekPlus2BudgetHigh - weekPlus2BudgetLow,
        scope_band_low: weekPlus2ScopeLow,
        scope_band_range: weekPlus2ScopeHigh - weekPlus2ScopeLow,
        schedule_band_low: weekPlus2ScheduleLow,
        schedule_band_range: weekPlus2ScheduleHigh - weekPlus2ScheduleLow,
      },
    ];

    return [...actualRows, ...forecastRows];
  }, [forecast, history]);

  function toggleMetric(metric: keyof typeof metricConfig) {
    setVisibleMetrics((prev) => ({ ...prev, [metric]: !prev[metric] }));
  }

  return (
    <section className="h-full rounded-xl border border-border bg-[#111827] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-gray-500">Trend &amp; 2-Week Forecast</p>
        <div className="flex flex-wrap gap-2">
        {(Object.keys(metricConfig) as (keyof typeof metricConfig)[]).map((metric) => (
          <button
            key={metric}
            type="button"
            onClick={() => toggleMetric(metric)}
            className={`rounded-md border px-3 py-1 text-xs font-semibold ${
              visibleMetrics[metric]
                ? "border-accent-blue bg-accent-blue text-white"
                : "border-gray-700 text-gray-500"
            }`}
          >
            {metricConfig[metric].label}
          </button>
        ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="h-[260px] min-w-[720px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={35}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                labelStyle={{ color: "#F9FAFB" }}
              />
              {lastActualWeek ? (
                <ReferenceLine
                  x={lastActualWeek}
                  stroke="#3B82F6"
                  strokeDasharray="6 3"
                  label={{ value: "Forecast →", position: "insideTopRight", fontSize: 10, fill: "#6B7280" }}
                />
              ) : null}

              {visibleMetrics.budget ? (
                <>
                  <Area dataKey="budget_band_low" stroke="none" fillOpacity={0} stackId="budget-band" />
                  <Area
                    dataKey="budget_band_range"
                    stroke="none"
                    fill={metricConfig.budget.color}
                    fillOpacity={0.15}
                    stackId="budget-band"
                    legendType="none"
                  />
                  <Line
                    dataKey="budget_actual"
                    name="Budget Burn (Actual)"
                    stroke={metricConfig.budget.color}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="budget_forecast"
                    name="Budget Burn (Forecast)"
                    stroke={metricConfig.budget.color}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                </>
              ) : null}

              {visibleMetrics.scope ? (
                <>
                  <Area dataKey="scope_band_low" stroke="none" fillOpacity={0} stackId="scope-band" />
                  <Area
                    dataKey="scope_band_range"
                    stroke="none"
                    fill={metricConfig.scope.color}
                    fillOpacity={0.15}
                    stackId="scope-band"
                    legendType="none"
                  />
                  <Line
                    dataKey="scope_actual"
                    name="Scope Completion (Actual)"
                    stroke={metricConfig.scope.color}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="scope_forecast"
                    name="Scope Completion (Forecast)"
                    stroke={metricConfig.scope.color}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                </>
              ) : null}

              {visibleMetrics.schedule ? (
                <>
                  <Area dataKey="schedule_band_low" stroke="none" fillOpacity={0} stackId="schedule-band" />
                  <Area
                    dataKey="schedule_band_range"
                    stroke="none"
                    fill={metricConfig.schedule.color}
                    fillOpacity={0.15}
                    stackId="schedule-band"
                    legendType="none"
                  />
                  <Line
                    dataKey="schedule_actual"
                    name="Schedule Health (Actual)"
                    stroke={metricConfig.schedule.color}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="schedule_forecast"
                    name="Schedule Health (Forecast)"
                    stroke={metricConfig.schedule.color}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                </>
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
