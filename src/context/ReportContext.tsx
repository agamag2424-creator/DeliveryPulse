// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.

"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { emptyReportInputState } from "@/hooks/useReportInput";
import type { ReportInput, SlideData } from "@/types/report";

interface ReportContextValue {
  reportInput: ReportInput;
  setReportInput: React.Dispatch<React.SetStateAction<ReportInput>>;
  reportOutput: SlideData | null;
  setReportOutput: React.Dispatch<React.SetStateAction<SlideData | null>>;
  hasGeneratedInput: boolean;
  setHasGeneratedInput: React.Dispatch<React.SetStateAction<boolean>>;
}

const ReportContext = createContext<ReportContextValue | undefined>(undefined);

export function ReportProvider({ children }: { children: React.ReactNode }) {
  const [reportInput, setReportInput] = useState<ReportInput>(emptyReportInputState);
  const [reportOutput, setReportOutput] = useState<SlideData | null>(null);
  const [hasGeneratedInput, setHasGeneratedInput] = useState(false);

  const value = useMemo<ReportContextValue>(
    () => ({
      reportInput,
      setReportInput,
      reportOutput,
      setReportOutput,
      hasGeneratedInput,
      setHasGeneratedInput,
    }),
    [hasGeneratedInput, reportInput, reportOutput],
  );

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
}

export function useReportContext() {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error("useReportContext must be used within ReportProvider");
  }
  return context;
}
