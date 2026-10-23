interface ReportFlowProgressProps {
  activeStep: 1 | 2 | 3;
  jiraLabel?: string;
}

const STEPS = [
  { id: 1, label: "Pulling data" },
  { id: 2, label: "Review gaps" },
  { id: 3, label: "Report ready" },
] as const;

export function ReportFlowProgress({ activeStep, jiraLabel }: ReportFlowProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 md:gap-4">
        {STEPS.map((step, index) => {
          const completed = step.id < activeStep;
          const active = step.id === activeStep;
          return (
            <div key={step.id} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  completed
                    ? "bg-rag-green/15 text-rag-green"
                    : active
                      ? "bg-ink text-cream"
                      : "bg-background-elevated text-text-muted"
                }`}
              >
                {completed ? "✓" : step.id}
              </span>
              <span className={`text-xs md:text-sm ${active ? "text-text-primary" : "text-text-muted"}`}>
                {step.label}
              </span>
              {index < STEPS.length - 1 ? (
                <span className="hidden text-text-muted md:inline" aria-hidden="true">
                  →
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {jiraLabel ? <p className="text-xs text-text-muted">{jiraLabel}</p> : null}
    </div>
  );
}
