import type { SlideData } from "@/types/report";

interface ForecastNarrativePanelProps {
  forecast: SlideData["forecast"];
}

export function ForecastNarrativePanel({ forecast }: ForecastNarrativePanelProps) {
  return (
    <section className="rounded-xl border border-border bg-background-elevated p-4">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">Forecast Narrative</p>
      <ul className="space-y-2 text-sm text-text-secondary">
        <li>
          <span className="font-semibold text-text-primary">Budget:</span> {forecast.budget_burn.narrative}
        </li>
        <li>
          <span className="font-semibold text-text-primary">Scope:</span> {forecast.scope_completion.narrative}
        </li>
        <li>
          <span className="font-semibold text-text-primary">Schedule:</span> {forecast.schedule_health.narrative}
        </li>
      </ul>
    </section>
  );
}
