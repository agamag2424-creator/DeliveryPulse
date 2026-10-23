# DeliveryPulse Codebase Audit — Phase 2 Preparation

**Epic:** E-P2-00-S2  
**Date:** 2026-05-30

One row per project file. Touch points are specific and minimal per Phase 2 backlog rules.

---

## Type Naming Discrepancy (Document Only — Do Not Rename)

| Name | Location | Used By |
|---|---|---|
| `SlideData` | `src/types/report.ts` | Phase 1: `ReportContext`, all slide components, report page |
| `ReportOutput` | `src/lib/reportOutputSchema.ts` (Zod infer) | Phase 1: input page (API response), generate route validation |
| `ReportOutput` | Phase 2 backlog / new files | DB `outputSnapshot`, agent, embeddings, history viewer |

These types describe the same Claude-generated report shape. Phase 1 stores it as `SlideData` in context after mapping from `ReportOutput`. Phase 2 new code uses `ReportOutput`; imports from Phase 1 types stay as `SlideData` / `ReportInput` without aliasing.

---

## Source — App Routes & Layout

| File | Purpose | Phase 2 Touch Point |
|---|---|---|
| `src/app/page.tsx` | Landing page with CTAs to `/input` and demo mode | None — may add link to `/login` or `/dashboard` via new landing wrapper in Phase 2 if needed; file frozen |
| `src/app/input/page.tsx` | Eight-section report input form; calls `/api/generate`; sets ReportContext | E-P2-04-S4: read `?projectId=` via ProjectContext (new wrapper page or banner — do not modify this file internals; navigation/pre-fill handled externally) |
| `src/app/report/page.tsx` | Renders 6 slides from ReportContext; presentation mode; redirects if no input | E-P2-05-S1: save indicator via new wrapper or sibling component reading ProjectContext — do not modify slide rendering |
| `src/app/layout.tsx` | Root HTML shell, inline header, fonts, wraps AppProviders | E-P2-00-S3: wrap AppProviders with ProjectProvider. E-P2-01-S5: add auth conditional to existing header (Sign In vs avatar dropdown) — no structural/header component changes |
| `src/app/globals.css` | Tailwind v4 import, CSS variables for Phase 1 design tokens | None |
| `src/app/print.css` | Print/PDF layout overrides | None |

## Source — API

| File | Purpose | Phase 2 Touch Point |
|---|---|---|
| `src/app/api/generate/route.ts` | POST handler: validates ReportInput, calls Claude, returns ReportOutput JSON | E-P2-07-S7: extract Claude logic to `src/lib/claude/generateReport.ts`; route imports shared function — no prompt/schema changes. Optional: session check at line 1 of POST handler |

## Source — Context & Hooks

| File | Purpose | Phase 2 Touch Point |
|---|---|---|
| `src/context/ReportContext.tsx` | Client state: reportInput, reportOutput (SlideData), hasGeneratedInput | None — ProjectContext watches reportOutput via useEffect; this file unchanged |
| `src/hooks/useReportInput.ts` | emptyReportInputState, sampleReportInputState, form defaults | None |

## Source — Types & Data

| File | Purpose | Phase 2 Touch Point |
|---|---|---|
| `src/types/report.ts` | ReportInput, SlideData, RAID, milestones, commercial types | None — Phase 2 imports ReportInput directly |
| `src/data/cloudbridge-sample.ts` | CloudBridge demo ReportInput for `?demo=true` | None |

## Source — Lib

| File | Purpose | Phase 2 Touch Point |
|---|---|---|
| `src/lib/claudeReportPrompt.ts` | REPORT_SYSTEM_PROMPT and buildReportUserPrompt() | None — shared generateReport.ts imports this unchanged |
| `src/lib/reportOutputSchema.ts` | Zod schema and ReportOutput type for API validation | None — Phase 2 imports ReportOutput from here |
| `src/lib/exportPDF.ts` | Client-side PDF export from DOM | None |

## Source — Providers

| File | Purpose | Phase 2 Touch Point |
|---|---|---|
| `src/components/providers/AppProviders.tsx` | Wraps ReportProvider around children | None — ProjectProvider added in layout.tsx outside this file |

## Source — Form Components

| File | Purpose | Phase 2 Touch Point |
|---|---|---|
| `src/components/form/FormDatePicker.tsx` | Styled date input | None |
| `src/components/form/FormInput.tsx` | Styled text/number input | None |
| `src/components/form/FormSelect.tsx` | Styled select dropdown | None |
| `src/components/form/SectionWrapper.tsx` | Collapsible form section container | None |

## Source — Slide Components

| File | Purpose | Phase 2 Touch Point |
|---|---|---|
| `src/components/slides/Slide1.tsx` | Slide 1 — project identity, RAG, KPI tiles | None — reused for historical reports (E-P2-05-S3) via props |
| `src/components/slides/Slide2.tsx` | Slide 2 — executive summary, forecast, editable RAG override | None |
| `src/components/slides/Slide3.tsx` | Slide 3 — workstream execution, velocity, blockers | None |
| `src/components/slides/Slide4.tsx` | Slide 4 — RAID intelligence dashboard | None |
| `src/components/slides/Slide5.tsx` | Slide 5 — commercial and financial health | None |
| `src/components/slides/Slide6.tsx` | Slide 6 — decisions required | None |
| `src/components/slides/SlideShell.tsx` | Shared slide frame, header/footer slots | None |
| `src/components/slides/SlideTitle.tsx` | Slide title and week label header | None |
| `src/components/slides/RAGBadge.tsx` | RAG status badge (RED/AMBER/GREEN) | None |
| `src/components/slides/KPITile.tsx` | Single KPI metric display tile | None |
| `src/components/slides/MilestoneGantt.tsx` | Milestone timeline Gantt chart | None |
| `src/components/slides/TrendForecastChart.tsx` | Recharts trend/forecast line chart | None |
| `src/components/slides/WorkstreamScorecard.tsx` | Workstream scorecard table | None |
| `src/components/slides/RAIDMatrix.tsx` | 2×2 RAID quadrant matrix | None |
| `src/components/slides/RAIDItemCard.tsx` | Individual RAID item card | None |
| `src/components/slides/DecisionCard.tsx` | Decision-required card | None |
| `src/components/slides/ExecutiveSummaryPanel.tsx` | Executive summary text panel | None |
| `src/components/slides/HighlightsPanel.tsx` | Wins and concerns lists | None |
| `src/components/slides/ForecastSignalsPanel.tsx` | Forecast signal indicators | None |
| `src/components/slides/ForecastNarrativePanel.tsx` | Forecast narrative text block | None |
| `src/components/slides/BlockerDetailPanel.tsx` | Blocker detail list panel | None |
| `src/components/slides/TimelineProgress.tsx` | Timeline progress visualization | None |
| `src/components/slides/VelocityBar.tsx` | Velocity bar chart | None |
| `src/components/slides/CapacityChart.tsx` | Team capacity chart | None |
| `src/components/slides/ConfidentialBadge.tsx` | Confidential watermark badge | None |

## Source — Presentation

| File | Purpose | Phase 2 Touch Point |
|---|---|---|
| `src/components/presentation/PresentationMode.tsx` | Fullscreen slide presenter with keyboard/touch nav | None — reused for historical reports |

---

## Configuration & Root Files

| File | Purpose | Phase 2 Touch Point |
|---|---|---|
| `package.json` | Dependencies and scripts | E-P2-00-S5: add Phase 2 packages |
| `package-lock.json` | Lockfile | Updated by npm install |
| `tsconfig.json` | TypeScript compiler options | None unless path aliases needed |
| `tailwind.config.ts` | Tailwind theme extensions | None — Phase 2 uses existing tokens |
| `postcss.config.mjs` | PostCSS/Tailwind pipeline | None |
| `next.config.ts` | Next.js configuration | None unless middleware/auth config needed |
| `eslint.config.mjs` | ESLint rules | None |
| `vercel.json` | Vercel deployment config | E-P2-12-S5: env vars on Vercel |
| `.gitignore` | Git ignore rules | E-P2-00-S4: ensure `.env.local` ignored, `.env.local.example` committed |
| `next-env.d.ts` | Next.js TypeScript declarations | Auto-generated |
| `public/*` | Static assets (favicon, etc.) | None |
| `README.md` | Project readme | Optional docs update at E-P2-12 |
| `CLAUDE.md` | AI assistant project notes | None |
| `AGENTS.md` | Agent instructions | None |
| `FROZEN_FILES.md` | Phase 1 freeze registry | Phase 2 documentation — maintained |
| `AUDIT.md` | This file | Phase 2 documentation — maintained |

---

## Phase 2 Files (Not Frozen — Created During E-P2-00+)

| File | Purpose | Epic |
|---|---|---|
| `src/context/ProjectContext.tsx` | userId, projectId, saveReport, DB ops shell → full impl | E-P2-00-S3, E-P2-02 |
| `.env.local.example` | Documented env var template | E-P2-00-S4 |
| `prisma/schema.prisma` | Full database schema | E-P2-00-S5 |

---

*Total Phase 1 source files audited: 45*  
*Total config/root files audited: 14*
