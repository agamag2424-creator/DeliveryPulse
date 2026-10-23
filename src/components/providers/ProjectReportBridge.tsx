"use client";

import { useEffect, useRef } from "react";

import { useReportSaveStatus } from "@/context/ReportSaveContext";
import { useProjectContext } from "@/context/ProjectContext";
import { useReportContext } from "@/context/ReportContext";
import type { ReportOutput } from "@/lib/reportOutputSchema";

/** Watches ReportContext and triggers saveReport in ProjectContext — the only Phase 1↔2 join point. */
export function ProjectReportBridge() {
  const { userId, projectId, saveReport } = useProjectContext();
  const { reportInput, reportOutput } = useReportContext();
  const { setSaving, setSaved, setError, reset } = useReportSaveStatus();
  const lastSavedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!reportOutput || !reportInput) {
      reset();
      return;
    }

    if (!userId || !projectId) {
      setError("No project selected — report not saved");
      return;
    }

    const saveKey = `${projectId}:${reportInput.projectData.reportingPeriodTo}:${reportOutput.rag_status}`;
    if (lastSavedRef.current === saveKey) {
      return;
    }

    setSaving();

    void saveReport(reportInput, reportOutput as ReportOutput)
      .then(() => {
        lastSavedRef.current = saveKey;
        setSaved();
      })
      .catch(() => {
        setError("report not saved");
      });
  }, [userId, projectId, reportInput, reportOutput, saveReport, setSaving, setSaved, setError, reset]);

  return null;
}
