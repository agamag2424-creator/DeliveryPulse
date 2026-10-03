# Phase 1 Frozen Files

These files existed before Phase 2 and must not be modified without explicit written instruction from Agam.

**Rule:** If it existed before Phase 2 started, it is frozen. When in doubt, freeze it.

**Permitted Phase 2 touch points (only where noted in backlog):**
- Auth session check at route level
- `saveReport()` call after generation
- Minimum-touch extensions explicitly called out in `AUDIT.md`

Every frozen file has this header comment at line 1:

```
// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
```

---

## App Routes & Layout

| File | Notes |
|---|---|
| `src/app/page.tsx` | Landing page |
| `src/app/input/page.tsx` | Multi-section report input form |
| `src/app/report/page.tsx` | Six-slide report viewer + presentation mode |
| `src/app/layout.tsx` | Root layout, header, font loading — minimum-touch auth UI in E-P2-01 |
| `src/app/globals.css` | Global styles and design tokens |
| `src/app/print.css` | Print/PDF export styles |

## API

| File | Notes |
|---|---|
| `src/app/api/generate/route.ts` | Claude report generation endpoint |

## Context & Hooks

| File | Notes |
|---|---|
| `src/context/ReportContext.tsx` | Phase 1 form state and report output |
| `src/hooks/useReportInput.ts` | Report input state helpers and empty defaults |

## Types & Data

| File | Notes |
|---|---|
| `src/types/report.ts` | ReportInput, SlideData, and all Phase 1 types |
| `src/data/cloudbridge-sample.ts` | CloudBridge demo/sample data |

## Lib

| File | Notes |
|---|---|
| `src/lib/claudeReportPrompt.ts` | Claude system/user prompt builders |
| `src/lib/reportOutputSchema.ts` | Zod schema for Claude report output |
| `src/lib/exportPDF.ts` | Client-side PDF export via html2canvas + jsPDF |

## Providers

| File | Notes |
|---|---|
| `src/components/providers/AppProviders.tsx` | Wraps ReportProvider |

## Form Components

| File | Notes |
|---|---|
| `src/components/form/FormDatePicker.tsx` | Date picker input |
| `src/components/form/FormInput.tsx` | Text/number input |
| `src/components/form/FormSelect.tsx` | Select dropdown |
| `src/components/form/SectionWrapper.tsx` | Form section container |

## Slide Components

| File | Notes |
|---|---|
| `src/components/slides/Slide1.tsx` | Slide 1 — Executive summary |
| `src/components/slides/Slide2.tsx` | Slide 2 — Highlights |
| `src/components/slides/Slide3.tsx` | Slide 3 — Milestones & timeline |
| `src/components/slides/Slide4.tsx` | Slide 4 — RAID matrix |
| `src/components/slides/Slide5.tsx` | Slide 5 — Workstreams |
| `src/components/slides/Slide6.tsx` | Slide 6 — Commercial & forecast |
| `src/components/slides/SlideShell.tsx` | Shared slide frame/layout |
| `src/components/slides/SlideTitle.tsx` | Slide title header |
| `src/components/slides/RAGBadge.tsx` | RAG status badge |
| `src/components/slides/KPITile.tsx` | KPI metric tile |
| `src/components/slides/MilestoneGantt.tsx` | Milestone Gantt chart |
| `src/components/slides/TrendForecastChart.tsx` | Trend/forecast Recharts chart |
| `src/components/slides/WorkstreamScorecard.tsx` | Workstream scorecard table |
| `src/components/slides/RAIDMatrix.tsx` | RAID matrix grid |
| `src/components/slides/RAIDItemCard.tsx` | Individual RAID item card |
| `src/components/slides/DecisionCard.tsx` | Decision card component |
| `src/components/slides/ExecutiveSummaryPanel.tsx` | Executive summary panel |
| `src/components/slides/HighlightsPanel.tsx` | Wins/concerns highlights panel |
| `src/components/slides/ForecastSignalsPanel.tsx` | Forecast signals panel |
| `src/components/slides/ForecastNarrativePanel.tsx` | Forecast narrative text |
| `src/components/slides/BlockerDetailPanel.tsx` | Blocker detail panel |
| `src/components/slides/TimelineProgress.tsx` | Timeline progress bar |
| `src/components/slides/VelocityBar.tsx` | Velocity bar chart |
| `src/components/slides/CapacityChart.tsx` | Capacity chart |
| `src/components/slides/ConfidentialBadge.tsx` | Confidential watermark badge |

## Presentation

| File | Notes |
|---|---|
| `src/components/presentation/PresentationMode.tsx` | Full-screen presentation mode |

---

**Total frozen source files: 45**

*Last updated: E-P2-00-S1*
