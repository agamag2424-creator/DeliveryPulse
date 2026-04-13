"use client";

import { ReportProvider } from "@/context/ReportContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <ReportProvider>{children}</ReportProvider>;
}
