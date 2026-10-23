// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.

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
