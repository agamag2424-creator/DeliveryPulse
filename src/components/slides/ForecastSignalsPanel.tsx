import type { SlideData } from "@/types/report";

import { RAGBadge } from "@/components/slides/RAGBadge";

interface ForecastSignalsPanelProps {
  forecast: SlideData["forecast"];
}

function SignalRow({
  label,
  rag,
  narrative,
}: {
  label: string;
  rag: "RED" | "AMBER" | "GREEN";
  narrative: string;
}) {
  const toneClass =
    rag === "RED"
      ? "border-rag-red/40 bg-rag-red/10"
      : rag === "AMBER"
        ? "border-rag-amber/40 bg-rag-amber/10"
        : "border-rag-green/40 bg-rag-green/10";

  return (
    <div className={`grid items-center gap-2 rounded-lg border p-3 md:grid-cols-[120px_90px_1fr] ${toneClass}`}>
      <p className="text-xs uppercase text-gray-400">{label}</p>
      <RAGBadge status={rag} size="mini" />
      <p className="truncate text-xs text-gray-300" title={narrative}>
        {narrative}
      </p>
    </div>
  );
}

export function ForecastSignalsPanel({ forecast }: ForecastSignalsPanelProps) {
  return (
    <section className="grid gap-2 md:grid-cols-3">
      <SignalRow
        label="Budget"
        rag={forecast.budget_burn.forecast_rag}
        narrative={forecast.budget_burn.narrative}
      />
      <SignalRow
        label="Scope"
        rag={forecast.scope_completion.forecast_rag}
        narrative={forecast.scope_completion.narrative}
      />
      <SignalRow
        label="Schedule"
        rag={forecast.schedule_health.forecast_rag}
        narrative={forecast.schedule_health.narrative}
      />
    </section>
  );
}
