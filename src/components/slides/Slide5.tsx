// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.

"use client";

import {
  Bar,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

import { ConfidentialBadge } from "@/components/slides/ConfidentialBadge";
import { SlideShell } from "@/components/slides/SlideShell";
import { SlideTitle } from "@/components/slides/SlideTitle";
import type { ChangeRequest, CommercialHistoryRow, MilestoneBillingRow, ReportInput, SlideData } from "@/types/report";

interface Slide5Props {
  reportInput: ReportInput;
  reportOutput: SlideData;
}

function formatCurrency(currency: string, value: number) {
  return `${currency} ${value.toLocaleString()}`;
}

function formatCurrencyK(value: number) {
  return `${Math.round(value / 1000)}k`;
}

function remainingColor(remaining: number, contractValue: number) {
  const ratio = contractValue > 0 ? (remaining / contractValue) * 100 : 0;
  if (ratio < 20) return "text-rag-red";
  if (ratio < 35) return "text-rag-amber";
  return "text-rag-green";
}

function forecastColor(forecast: number, contractValue: number) {
  if (forecast > contractValue) return "text-rag-red";
  if (forecast >= contractValue * 0.95) return "text-rag-amber";
  return "text-rag-green";
}

function BurnRateChart({
  history,
  plannedWeeklyBurnRate,
  currency,
}: {
  history: CommercialHistoryRow[];
  plannedWeeklyBurnRate: number;
  currency: string;
}) {
  const rows = history.slice(-5).map((row) => ({
    weekLabel: row.weekLabel,
    actual: row.actualCostThatWeek ?? 0,
    planned: plannedWeeklyBurnRate,
  }));

  return (
    <div className="h-[210px] rounded-xl bg-[#111827] p-3">
      <p className="mb-2 text-xs uppercase text-gray-500">Weekly Burn Rate</p>
      <ResponsiveContainer width="100%" height="88%">
        <ComposedChart data={rows}>
          <CartesianGrid vertical={false} stroke="rgba(55,65,81,0.4)" />
          <XAxis dataKey="weekLabel" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
          <YAxis tickFormatter={formatCurrencyK} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
          <Tooltip
            formatter={(value, key) =>
              String(key) === "actual"
                ? `Actual ${formatCurrency(currency, Number(value ?? 0))}`
                : `Planned ${formatCurrency(currency, Number(value ?? 0))}`
            }
            labelFormatter={(label) => `${label}`}
            contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
          />
          <Legend />
          <Bar
            dataKey="actual"
            name="Actual Burn"
            barSize={28}
            fill="#10B981"
            shape={(props) => {
              const { x, y, width, height, payload } = props as {
                x: number;
                y: number;
                width: number;
                height: number;
                payload: { actual: number; planned: number };
              };
              return (
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={payload.actual > payload.planned ? "#EF4444" : "#10B981"}
                  rx={4}
                />
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="planned"
            name="Planned Rate"
            stroke="#F59E0B"
            strokeDasharray="5 3"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function MilestoneBillingTracker({ rows, currency }: { rows: MilestoneBillingRow[]; currency: string }) {
  const statusBadge: Record<MilestoneBillingRow["status"], string> = {
    Paid: "bg-green-500/20 border border-green-500/30 text-green-400",
    Due: "bg-amber-500/20 text-amber-400",
    Scheduled: "bg-gray-500/20 text-gray-400",
    Overdue: "bg-red-500/20 text-red-400",
  };
  const label: Record<MilestoneBillingRow["status"], string> = {
    Paid: "✅ Paid",
    Due: "⏰ Due",
    Scheduled: "📅 Scheduled",
    Overdue: "🔴 Overdue",
  };
  return (
    <div className="rounded-xl bg-[#111827] p-3">
      <p className="mb-2 text-xs uppercase text-gray-500">Milestone Billing Tracker</p>
      <div className="max-h-[190px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="text-gray-500">
            <tr>
              <th className="pb-2 text-left">MILESTONE</th>
              <th className="pb-2 text-left">VALUE</th>
              <th className="pb-2 text-left">DUE DATE</th>
              <th className="pb-2 text-left">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.milestoneName}-${row.dueDate}`} className="border-t border-gray-800">
                <td className="py-2 text-gray-300">{row.milestoneName}</td>
                <td className="py-2 text-gray-300">{formatCurrency(currency, row.billingValue)}</td>
                <td className="py-2 text-gray-400">{row.dueDate}</td>
                <td className="py-2">
                  <span className={`rounded px-2 py-0.5 ${statusBadge[row.status]}`}>{label[row.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EacTrendChart({
  history,
  engagementModel,
  contractValue,
  currency,
  eacOverrunFlag,
}: {
  history: CommercialHistoryRow[];
  engagementModel: "TNM" | "FP";
  contractValue: number;
  currency: string;
  eacOverrunFlag: boolean;
}) {
  const rows = history.slice(-5).map((row) => ({
    weekLabel: row.weekLabel,
    value: engagementModel === "TNM" ? (row.eacAtEndOfWeek ?? 0) : (row.forecastFinalCost ?? 0),
  }));
  const maxValue = Math.max(contractValue, ...rows.map((row) => row.value));
  return (
    <div className="h-[210px] rounded-xl bg-[#111827] p-3">
      <p className="mb-2 text-xs uppercase text-gray-500">
        {engagementModel === "TNM" ? "EAC Trend vs Contract Ceiling" : "Forecast Cost Trend"}
      </p>
      <ResponsiveContainer width="100%" height="88%">
        <LineChart data={rows}>
          <CartesianGrid vertical={false} stroke="rgba(55,65,81,0.4)" />
          <XAxis dataKey="weekLabel" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
          <YAxis tickFormatter={formatCurrencyK} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
          <Tooltip
            formatter={(value) =>
              `${engagementModel === "TNM" ? "EAC" : "Forecast"} ${formatCurrency(currency, Number(value ?? 0))}`
            }
            labelFormatter={(label) => `${label}`}
            contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
          />
          <ReferenceLine
            y={contractValue}
            stroke="#EF4444"
            strokeDasharray="5 3"
            strokeWidth={2}
            label={{ value: "Contract Ceiling", position: "insideTopRight", fontSize: 10, fill: "#EF4444" }}
          />
          {eacOverrunFlag ? (
            <ReferenceArea y1={contractValue} y2={maxValue + 10000} fill="rgba(239,68,68,0.08)" stroke="none" />
          ) : null}
          <Line
            dataKey="value"
            stroke="#3B82F6"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#3B82F6" }}
            activeDot={{ r: 6 }}
            name={engagementModel === "TNM" ? "EAC" : "Forecast Final"}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function statusBadge(status: ChangeRequest["status"]) {
  if (status === "Approved") return "bg-green-500/20 text-green-400";
  if (status === "Pending") return "bg-amber-500/20 text-amber-400";
  return "bg-gray-500/20 text-gray-600";
}

function statusLabel(status: ChangeRequest["status"]) {
  if (status === "Approved") return "✅ Approved";
  if (status === "Pending") return "⏳ Pending";
  return "❌ Rejected";
}

export function Slide5({ reportInput, reportOutput }: Slide5Props) {
  const financial = reportOutput.financial_kpis;
  const isTNM = financial.engagement_model === "TNM";
  const currency = financial.currency;
  const history = isTNM
    ? (reportInput.commercialData.tnmHistory ?? [])
    : (reportInput.commercialData.fpHistory ?? []);
  const consumedFromHistory = isTNM
    ? history.reduce((sum, row) => sum + (row.actualCostThatWeek ?? 0), 0)
    : financial.consumed_to_date;
  const consumedToDate = consumedFromHistory > 0 ? consumedFromHistory : financial.consumed_to_date;
  const consumedPercent = financial.contract_value > 0 ? Math.round((consumedToDate / financial.contract_value) * 100) : 0;
  const plannedWeeklyBurnRate = reportInput.commercialData.plannedWeeklyBurnRate ?? 0;
  const crRows = reportInput.commercialData.changeRequests;
  const approvedTotal = crRows.filter((row) => row.status === "Approved").reduce((sum, row) => sum + row.valueImpact, 0);
  const pendingTotal = crRows.filter((row) => row.status === "Pending").reduce((sum, row) => sum + row.valueImpact, 0);
  const rejectedCount = crRows.filter((row) => row.status === "Rejected").length;
  const revisedContract = financial.contract_value + approvedTotal;

  return (
    <SlideShell slideNumber={5} totalSlides={6}>
      <ConfidentialBadge />

      <div className="grid gap-4">
        <SlideTitle title="Slide 5 - Commercial & Financial Health" />

        <section className="grid gap-3 md:grid-cols-5">
          <div className="rounded-lg bg-[#111827] p-4">
            <p className="text-xs uppercase text-gray-500">Contract Value</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(currency, financial.contract_value)}</p>
          </div>
          <div className="rounded-lg bg-[#111827] p-4">
            <p className="text-xs uppercase text-gray-500">{isTNM ? "Consumed to Date" : "Invoiced to Date"}</p>
            <p className={`text-2xl font-bold ${financial.consumed_rag === "RED" ? "text-rag-red" : financial.consumed_rag === "AMBER" ? "text-rag-amber" : "text-rag-green"}`}>
              {formatCurrency(currency, consumedToDate)}
            </p>
            <p className="text-xs text-gray-500">{consumedPercent}% of contract</p>
          </div>
          <div className="rounded-lg bg-[#111827] p-4">
            <p className="text-xs uppercase text-gray-500">{isTNM ? "Remaining Budget" : "Remaining to Bill"}</p>
            <p className={`text-2xl font-bold ${remainingColor(financial.remaining, financial.contract_value)}`}>
              {formatCurrency(currency, financial.remaining)}
            </p>
          </div>
          <div className="rounded-lg bg-[#111827] p-4">
            <p className="text-xs uppercase text-gray-500">{isTNM ? "Forecast EAC" : "Forecast Final Cost"}</p>
            <p className={`text-2xl font-bold ${forecastColor(financial.forecast_final, financial.contract_value)}`}>
              {formatCurrency(currency, financial.forecast_final)}
            </p>
          </div>
          <div className="rounded-lg bg-[#111827] p-4">
            <p className="text-xs uppercase text-gray-500">Variance</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(currency, Math.abs(financial.variance))}</p>
            <p className={`text-xs ${financial.variance > 0 ? "text-rag-red" : "text-rag-green"}`}>
              {financial.variance === 0
                ? "On Budget"
                : financial.variance > 0
                  ? `↑ +${financial.variance_percent}%`
                  : `↓ -${Math.abs(financial.variance_percent)}%`}
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div>
            {isTNM ? (
              <BurnRateChart history={history} plannedWeeklyBurnRate={plannedWeeklyBurnRate} currency={currency} />
            ) : (
              <MilestoneBillingTracker rows={reportInput.commercialData.milestoneBilling ?? []} currency={currency} />
            )}
          </div>
          <EacTrendChart
            history={history}
            engagementModel={financial.engagement_model}
            contractValue={financial.contract_value}
            currency={currency}
            eacOverrunFlag={reportOutput.eac_overrun_flag}
          />
        </section>

        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wider text-gray-500">Change Request Register</p>
            <div className="text-xs">
              <span className="mr-3 text-green-400">Approved: +{formatCurrency(currency, approvedTotal)}</span>
              <span className="mr-3 text-amber-400">Pending: +{formatCurrency(currency, pendingTotal)}</span>
              <span className="text-gray-600">Rejected: {rejectedCount}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[550px] w-full overflow-hidden rounded-xl bg-[#111827]">
              <thead className="bg-[#1F2937] text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 text-left">CR ID</th>
                  <th className="px-4 py-2.5 text-left">Description</th>
                  <th className="px-4 py-2.5 text-left">Value Impact</th>
                  <th className="px-4 py-2.5 text-left">{isTNM ? "Hours Impact" : "Scope Impact"}</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {crRows.map((row) => (
                  <tr key={row.crId} className="border-b border-gray-800">
                    <td className="px-4 py-2 text-xs font-mono text-gray-400">{row.crId}</td>
                    <td className="px-4 py-2 text-sm text-gray-300">{row.description}</td>
                    <td
                      className={`px-4 py-2 text-sm font-semibold ${
                        row.status === "Approved"
                          ? "text-green-400"
                          : row.status === "Pending"
                            ? "text-amber-400"
                            : "text-gray-600 line-through"
                      }`}
                    >
                      +{formatCurrency(currency, row.valueImpact)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-400">{row.modelImpact}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs ${statusBadge(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">
            Baseline SOW: {formatCurrency(currency, financial.contract_value)} │ Approved CRs: +
            {formatCurrency(currency, approvedTotal)} │ Revised Contract: {formatCurrency(currency, revisedContract)} │
            Pending CRs: +{formatCurrency(currency, pendingTotal)}
          </p>
        </section>
      </div>
    </SlideShell>
  );
}
