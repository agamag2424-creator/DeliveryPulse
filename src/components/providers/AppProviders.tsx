// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.

"use client";

import { ReportProvider } from "@/context/ReportContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <ReportProvider>{children}</ReportProvider>;
}
