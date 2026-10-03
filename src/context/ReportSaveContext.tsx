"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type ReportSaveStatus = "idle" | "saving" | "saved" | "error";

interface ReportSaveContextValue {
  status: ReportSaveStatus;
  errorMessage: string | null;
  setSaving: () => void;
  setSaved: () => void;
  setError: (message: string) => void;
  reset: () => void;
  dismissError: () => void;
}

const ReportSaveContext = createContext<ReportSaveContextValue | undefined>(undefined);

export function ReportSaveProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ReportSaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setSaving = useCallback(() => {
    setErrorMessage(null);
    setStatus("saving");
  }, []);

  const setSaved = useCallback(() => {
    setErrorMessage(null);
    setStatus("saved");
  }, []);

  const setError = useCallback((message: string) => {
    setErrorMessage(message);
    setStatus("error");
  }, []);

  const reset = useCallback(() => {
    setErrorMessage(null);
    setStatus("idle");
  }, []);

  const dismissError = useCallback(() => {
    setErrorMessage(null);
    setStatus("idle");
  }, []);

  const value = useMemo(
    () => ({
      status,
      errorMessage,
      setSaving,
      setSaved,
      setError,
      reset,
      dismissError,
    }),
    [dismissError, errorMessage, reset, setError, setSaved, setSaving, status],
  );

  return <ReportSaveContext.Provider value={value}>{children}</ReportSaveContext.Provider>;
}

export function useReportSaveStatus() {
  const context = useContext(ReportSaveContext);
  if (!context) {
    throw new Error("useReportSaveStatus must be used within ReportSaveProvider");
  }
  return context;
}
