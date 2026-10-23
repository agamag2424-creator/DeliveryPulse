// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.
// Epic 3 (SaaS launch backlog): generate error path may show quota + upgrade CTA.

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HistoryRow, Milestone, RiskItem, Workstream } from "@/types/report";
import { FormDatePicker } from "@/components/form/FormDatePicker";
import { FormInput } from "@/components/form/FormInput";
import { FormSelect } from "@/components/form/FormSelect";
import { SectionWrapper } from "@/components/form/SectionWrapper";
import { useReportContext } from "@/context/ReportContext";
import { emptyReportInputState, sampleReportInputState } from "@/hooks/useReportInput";
import type { ReportOutput } from "@/lib/reportOutputSchema";
import { BILLING_UPGRADE_PATH, isQuotaExceededPayload } from "@/lib/usage/constants";

interface ValidationState {
  [key: string]: string | undefined;
}

const EIGHT_SECTIONS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const sectionTitles: Record<string, string> = {
  A: "Project Identity",
  B: "Health Indicators",
  C: "Milestones",
  D: "Free Text Dump",
  E: "Workstream Table",
  F: "RAID Log",
  G: "Commercial",
  H: "Decisions",
};

export default function InputPage() {
  const router = useRouter();
  const { reportInput, setReportInput, setReportOutput, setHasGeneratedInput } = useReportContext();
  const [errors, setErrors] = useState<ValidationState>({});
  const [showDetailPrompt, setShowDetailPrompt] = useState(false);
  const [raidTab, setRaidTab] = useState<"risks" | "issues" | "dependencies" | "assumptions">("risks");
  const [isGenerating, setIsGenerating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [pendingOutput, setPendingOutput] = useState<ReportOutput | null>(null);
  const [overrideRag, setOverrideRag] = useState<"RED" | "AMBER" | "GREEN">("GREEN");
  const [overrideReason, setOverrideReason] = useState("");
  const lastAppliedPreset = useRef<"demo" | "standard" | null>(null);

  useEffect(() => {
    const isDemoMode = new URLSearchParams(window.location.search).get("demo") === "true";
    const nextPreset = isDemoMode ? "demo" : "standard";
    if (lastAppliedPreset.current === nextPreset) {
      return;
    }

    if (isDemoMode) {
      setReportInput(sampleReportInputState);
      setPendingOutput(null);
      setSubmitError(null);
    }
    lastAppliedPreset.current = nextPreset;
  }, [setReportInput]);

  const emptyWorkstream: Workstream = {
    workstreamName: "",
    plannedTeamSize: 0,
    actualTeamSize: 0,
    tasksPlanned: 0,
    tasksCompleted: 0,
    activeBlockers: "",
    dependencyStatus: "Clear",
    blockers: [],
  };

  const updateHealthNumber = (
    field: "currentBudgetBurnPercent" | "currentScopeCompletionPercent" | "currentScheduleHealthPercent",
    value: string,
  ) => {
    if (!/^-?\d*$/.test(value)) {
      return;
    }
    setReportInput((previous) => ({
      ...previous,
      healthData: {
        ...previous.healthData,
        [field]: value === "" ? -1 : Number(value),
      },
    }));
  };

  const updateOptionalNumber = (field: "activeWorkstreams" | "teamSize", value: string) => {
    if (!/^\d*$/.test(value)) {
      return;
    }
    setReportInput((previous) => ({
      ...previous,
      healthData: {
        ...previous.healthData,
        [field]: value === "" ? undefined : Number(value),
      },
    }));
  };

  const updateHistoryRow = (index: number, field: keyof HistoryRow, value: string) => {
    if (
      (field === "budgetBurnPercent" || field === "scopeCompletionPercent" || field === "scheduleHealthPercent") &&
      !/^\d*$/.test(value)
    ) {
      return;
    }

    setReportInput((previous) => {
      const next = [...previous.healthHistory];
      if (field === "weekLabel") {
        next[index] = { ...next[index], [field]: value };
      } else {
        next[index] = { ...next[index], [field]: value === "" ? 0 : Number(value) };
      }
      return { ...previous, healthHistory: next };
    });
  };

  const updateMilestoneRow = (index: number, field: keyof Milestone, value: string) => {
    setReportInput((previous) => {
      const next = [...previous.milestones];
      next[index] = { ...next[index], [field]: value };
      return { ...previous, milestones: next };
    });
  };

  const validateField = (key: string, message?: string) => {
    setErrors((previous) => ({ ...previous, [key]: message }));
  };

  const validateRequiredText = (key: string, value: string) => {
    validateField(key, value.trim() ? undefined : "This field is required.");
  };

  const validatePercent = (key: string, value: number) => {
    if (Number.isNaN(value) || value < 0 || value > 100) {
      validateField(key, "Value must be between 0 and 100.");
      return;
    }
    validateField(key, undefined);
  };

  const validatePositiveNumber = (key: string, value: number) => {
    if (Number.isNaN(value) || value < 0) {
      validateField(key, "Value must be 0 or greater.");
      return;
    }
    validateField(key, undefined);
  };

  const validateHistoryRow = (index: number) => {
    const row = reportInput.healthHistory[index];
    validateRequiredText(`history-${index}-weekLabel`, row.weekLabel);
    validatePercent(`history-${index}-budgetBurnPercent`, row.budgetBurnPercent);
    validatePercent(`history-${index}-scopeCompletionPercent`, row.scopeCompletionPercent);
    validatePercent(`history-${index}-scheduleHealthPercent`, row.scheduleHealthPercent);
  };

  const validateMilestoneRow = (index: number) => {
    const row = reportInput.milestones[index];
    validateRequiredText(`milestone-${index}-milestoneName`, row.milestoneName);
    validateRequiredText(`milestone-${index}-baselineDate`, row.baselineDate);
    validateRequiredText(`milestone-${index}-forecastDate`, row.forecastDate);
  };

  const sectionAComplete =
    reportInput.projectData.projectName.trim() &&
    reportInput.projectData.clientName.trim() &&
    reportInput.projectData.reportingPeriodFrom &&
    reportInput.projectData.reportingPeriodTo &&
    reportInput.projectData.deliveryPMName.trim() &&
    reportInput.projectData.currentProjectPhase;

  const sectionBPrimaryComplete =
    reportInput.healthData.currentBudgetBurnPercent >= 0 &&
    reportInput.healthData.currentBudgetBurnPercent <= 100 &&
    reportInput.healthData.currentScopeCompletionPercent >= 0 &&
    reportInput.healthData.currentScopeCompletionPercent <= 100 &&
    reportInput.healthData.currentScheduleHealthPercent >= 0 &&
    reportInput.healthData.currentScheduleHealthPercent <= 100;

  const sectionBHistoryComplete =
    reportInput.healthHistory.length >= 2 &&
    reportInput.healthHistory.every(
      (row) =>
        row.weekLabel.trim() &&
        row.budgetBurnPercent >= 0 &&
        row.budgetBurnPercent <= 100 &&
        row.scopeCompletionPercent >= 0 &&
        row.scopeCompletionPercent <= 100 &&
        row.scheduleHealthPercent >= 0 &&
        row.scheduleHealthPercent <= 100,
    );

  const sectionCComplete =
    reportInput.milestones.length >= 3 &&
    reportInput.milestones.every(
      (row) => row.milestoneName.trim() && row.baselineDate && row.forecastDate && row.status,
    );

  const sectionDComplete = reportInput.freeTextDump.trim().length >= 50;

  const sectionEComplete =
    reportInput.workstreams.length >= 2 &&
    reportInput.workstreams.every(
      (row) =>
        row.workstreamName.trim() &&
        row.plannedTeamSize >= 0 &&
        row.actualTeamSize >= 0 &&
        row.tasksPlanned > 0 &&
        row.tasksCompleted >= 0 &&
        row.dependencyStatus,
    );

  const sectionFComplete =
    reportInput.raid.risks.every(
      (risk) =>
        risk.riskDescription.trim() &&
        risk.probability &&
        risk.impact &&
        (risk.status ?? "").trim() &&
        (risk.linkedMilestone ?? "").trim(),
    ) &&
    reportInput.raid.issues.every(
      (issue) =>
        issue.description.trim() &&
        issue.severity &&
        issue.dateRaised &&
        (issue.status ?? "").trim() &&
        (issue.linkedDecision ?? "").trim(),
    ) &&
    reportInput.raid.dependencies.every(
      (dependency) =>
        dependency.description.trim() &&
        dependency.type.trim() &&
        dependency.dueDate &&
        dependency.status.trim() &&
        dependency.blockingWhat.trim(),
    ) &&
    reportInput.raid.assumptions.every(
      (assumption) => assumption.statement.trim() && assumption.impactIfWrong.trim(),
    );

  const sectionGCommonComplete =
    reportInput.commercialData.originalContractValue > 0 &&
    Boolean(reportInput.commercialData.currency) &&
    Boolean(reportInput.commercialData.engagementStart) &&
    Boolean(reportInput.commercialData.engagementEnd);
  const sectionGTnmComplete =
    reportInput.commercialData.engagementModel === "TNM"
      ? Boolean(
          reportInput.commercialData.totalApprovedHours &&
            reportInput.commercialData.totalApprovedHours > 0 &&
            reportInput.commercialData.hoursConsumedToDate !== undefined &&
            reportInput.commercialData.hoursConsumedToDate >= 0 &&
            reportInput.commercialData.plannedWeeklyBurnRate &&
            reportInput.commercialData.plannedWeeklyBurnRate > 0 &&
            (reportInput.commercialData.tnmHistory ?? []).length >= 3,
        )
      : true;
  const sectionGFpComplete =
    reportInput.commercialData.engagementModel === "FP"
      ? Boolean(
          reportInput.commercialData.internalCostToDate !== undefined &&
            reportInput.commercialData.internalCostToDate >= 0 &&
            reportInput.commercialData.forecastFinalInternalCost &&
            reportInput.commercialData.forecastFinalInternalCost > 0 &&
            (reportInput.commercialData.fpHistory ?? []).length >= 3 &&
            (reportInput.commercialData.milestoneBilling ?? []).length >= 2,
        )
      : true;
  const sectionGComplete = sectionGCommonComplete && sectionGTnmComplete && sectionGFpComplete;

  const sectionHComplete = reportInput.decisions.every(
    (decision) =>
      decision.decisionTitle.trim() &&
      decision.ownerNameRole.trim() &&
      decision.ownerOrganisation.trim() &&
      decision.dueDate &&
      decision.priority,
  );

  const sectionCompletionMap = useMemo(
    () => ({
      A: Boolean(sectionAComplete),
      B: Boolean(sectionBPrimaryComplete && sectionBHistoryComplete),
      C: Boolean(sectionCComplete),
      D: Boolean(sectionDComplete),
      E: Boolean(sectionEComplete),
      F: Boolean(sectionFComplete),
      G: Boolean(sectionGComplete),
      H: Boolean(sectionHComplete),
    }),
    [
      sectionAComplete,
      sectionBPrimaryComplete,
      sectionBHistoryComplete,
      sectionCComplete,
      sectionDComplete,
      sectionEComplete,
      sectionFComplete,
      sectionGComplete,
      sectionHComplete,
    ],
  );

  const completedCount = Object.values(sectionCompletionMap).filter(Boolean).length;
  const presetMode = useMemo(() => {
    const current = JSON.stringify(reportInput);
    if (current === JSON.stringify(sampleReportInputState)) {
      return "Sample";
    }
    if (current === JSON.stringify(emptyReportInputState)) {
      return "Blank";
    }
    return "Custom";
  }, [reportInput]);

  const handleGenerateReport = async () => {
    setSubmitError(null);
    setQuotaExceeded(false);
    if (completedCount !== 8) {
      setSubmitError("Please complete all mandatory fields before generating the report.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setIsGenerating(true);
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportInput),
      });
      const payload = await response.json();
      if (!response.ok) {
        setQuotaExceeded(isQuotaExceededPayload(payload, response.status));
        setSubmitError(payload?.error ?? "Failed to generate report.");
        return;
      }

      const output = payload as ReportOutput;
      setPendingOutput(output);
      setOverrideRag(output.rag_status);
      setOverrideReason(output.rag_reason);
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to generate report.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmAndViewReport = () => {
    if (!pendingOutput) {
      return;
    }

    setReportInput(reportInput);
    const normalizedRaidAttentionItems = pendingOutput.raid_attention_items.map((item) => ({
      ...item,
      days_open: item.days_open ?? undefined,
      score: item.score ?? undefined,
    }));

    setReportOutput({
      ...pendingOutput,
      raid_attention_items: normalizedRaidAttentionItems,
      rag_status: overrideRag,
      rag_reason: overrideReason.trim() || pendingOutput.rag_reason,
    });
    setHasGeneratedInput(true);
    router.push("/report");
  };

  return (
    <main className="min-h-screen bg-background-primary px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {submitError ? (
          <div className="fixed right-4 top-20 z-50 rounded-lg border border-rag-red bg-rag-red/90 px-4 py-3 text-sm text-white shadow-lg">
            {submitError}
            {quotaExceeded ? (
              <>
                {" "}
                <Link href={BILLING_UPGRADE_PATH} className="font-semibold underline">
                  Upgrade to Pro
                </Link>
              </>
            ) : null}
          </div>
        ) : null}
        <div className="sticky top-2 z-20 rounded-panel border border-border bg-background-card/95 p-4 backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-text-primary">
              Section {completedCount} of 8 complete
            </p>
            <div className="grid grid-cols-4 gap-2 md:flex md:flex-wrap md:justify-end">
              {EIGHT_SECTIONS.map((section) => (
                <span
                  key={section}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    sectionCompletionMap[section as keyof typeof sectionCompletionMap]
                      ? "bg-rag-green/20 text-rag-green"
                      : "bg-background-elevated text-text-secondary"
                  }`}
                >
                  {section}: {sectionTitles[section]}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-background-elevated">
            <div
              className="h-full bg-rag-green transition-all"
              style={{ width: `${(completedCount / 8) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-panel border border-border bg-background-card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-text-primary">Project Input Form</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Enter project delivery data to generate the executive report.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-border bg-background-elevated px-3 py-2 text-xs font-semibold text-text-secondary">
                Preset: {presetMode}
              </span>
              <button
                type="button"
                className="rounded-[3px] border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-faint"
                onClick={() => setReportInput(sampleReportInputState)}
              >
                Reset to Sample Data
              </button>
              <button
                type="button"
                className="rounded-lg border border-rag-red px-4 py-2 text-sm text-rag-red hover:bg-rag-red/10"
                onClick={() => setReportInput(emptyReportInputState)}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        <SectionWrapper
          title="Section A — Project Identity"
          description="Core project metadata used throughout the generated report."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              id="projectName"
              label="Project Name"
              mandatory
              value={reportInput.projectData.projectName}
              error={errors.projectName}
              onChange={(event) =>
                setReportInput((previous) => ({
                  ...previous,
                  projectData: { ...previous.projectData, projectName: event.target.value },
                }))
              }
              onBlur={(event) => validateRequiredText("projectName", event.target.value)}
              placeholder="CloudBridge"
            />
            <FormInput
              id="clientName"
              label="Client Name"
              mandatory
              value={reportInput.projectData.clientName}
              error={errors.clientName}
              onChange={(event) =>
                setReportInput((previous) => ({
                  ...previous,
                  projectData: { ...previous.projectData, clientName: event.target.value },
                }))
              }
              onBlur={(event) => validateRequiredText("clientName", event.target.value)}
              placeholder="NorthBridge Financial Services"
            />
            <FormDatePicker
              id="periodFrom"
              label="Reporting Period From"
              mandatory
              value={reportInput.projectData.reportingPeriodFrom}
              error={errors.reportingPeriodFrom}
              onChange={(event) =>
                setReportInput((previous) => ({
                  ...previous,
                  projectData: { ...previous.projectData, reportingPeriodFrom: event.target.value },
                }))
              }
              onBlur={(event) => validateRequiredText("reportingPeriodFrom", event.target.value)}
            />
            <FormDatePicker
              id="periodTo"
              label="Reporting Period To"
              mandatory
              value={reportInput.projectData.reportingPeriodTo}
              error={errors.reportingPeriodTo}
              onChange={(event) =>
                setReportInput((previous) => ({
                  ...previous,
                  projectData: { ...previous.projectData, reportingPeriodTo: event.target.value },
                }))
              }
              onBlur={(event) => validateRequiredText("reportingPeriodTo", event.target.value)}
            />
            <FormInput
              id="deliveryPMName"
              label="Delivery PM Name"
              mandatory
              value={reportInput.projectData.deliveryPMName}
              error={errors.deliveryPMName}
              onChange={(event) =>
                setReportInput((previous) => ({
                  ...previous,
                  projectData: { ...previous.projectData, deliveryPMName: event.target.value },
                }))
              }
              onBlur={(event) => validateRequiredText("deliveryPMName", event.target.value)}
              placeholder="Agam Agrawwal"
            />
            <FormSelect
              id="projectPhase"
              label="Current Project Phase"
              mandatory
              value={reportInput.projectData.currentProjectPhase}
              error={errors.currentProjectPhase}
              onChange={(event) =>
                setReportInput((previous) => ({
                  ...previous,
                  projectData: {
                    ...previous.projectData,
                    currentProjectPhase: event.target.value as typeof previous.projectData.currentProjectPhase,
                  },
                }))
              }
              onBlur={(event) => validateRequiredText("currentProjectPhase", event.target.value)}
              options={[
                { label: "Initiation", value: "Initiation" },
                { label: "Planning", value: "Planning" },
                { label: "Build", value: "Build" },
                { label: "Testing", value: "Testing" },
                { label: "Go-Live", value: "Go-Live" },
                { label: "Hypercare", value: "Hypercare" },
              ]}
            />
          </div>
        </SectionWrapper>

        <SectionWrapper
          title="Section B — Health Indicators"
          description="Current health percentages plus historical trend rows."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              id="budgetBurn"
              label="Current Budget Burn %"
              mandatory
              value={reportInput.healthData.currentBudgetBurnPercent < 0 ? "" : reportInput.healthData.currentBudgetBurnPercent}
              error={errors.currentBudgetBurnPercent}
              inputMode="numeric"
              onChange={(event) => updateHealthNumber("currentBudgetBurnPercent", event.target.value)}
              onBlur={() =>
                validatePercent("currentBudgetBurnPercent", reportInput.healthData.currentBudgetBurnPercent)
              }
            />
            <FormInput
              id="scopeCompletion"
              label="Current Scope Completion %"
              mandatory
              value={
                reportInput.healthData.currentScopeCompletionPercent < 0
                  ? ""
                  : reportInput.healthData.currentScopeCompletionPercent
              }
              error={errors.currentScopeCompletionPercent}
              inputMode="numeric"
              onChange={(event) => updateHealthNumber("currentScopeCompletionPercent", event.target.value)}
              onBlur={() =>
                validatePercent("currentScopeCompletionPercent", reportInput.healthData.currentScopeCompletionPercent)
              }
            />
            <div>
              <FormInput
                id="scheduleHealth"
                label="Current Schedule Health %"
                mandatory
                value={
                  reportInput.healthData.currentScheduleHealthPercent < 0
                    ? ""
                    : reportInput.healthData.currentScheduleHealthPercent
                }
                error={errors.currentScheduleHealthPercent}
                inputMode="numeric"
                onChange={(event) => updateHealthNumber("currentScheduleHealthPercent", event.target.value)}
                onBlur={() =>
                  validatePercent("currentScheduleHealthPercent", reportInput.healthData.currentScheduleHealthPercent)
                }
              />
              <p className="mt-1 text-xs text-text-muted">
                100 = fully on schedule. Below 70 = Amber. Below 50 = Red.
              </p>
            </div>
            <FormInput
              id="activeWorkstreams"
              label="Active Workstreams"
              value={reportInput.healthData.activeWorkstreams ?? ""}
              inputMode="numeric"
              onChange={(event) => updateOptionalNumber("activeWorkstreams", event.target.value)}
            />
            <FormInput
              id="teamSize"
              label="Team Size"
              value={reportInput.healthData.teamSize ?? ""}
              inputMode="numeric"
              onChange={(event) => updateOptionalNumber("teamSize", event.target.value)}
            />
          </div>

          <div className="mt-6 overflow-x-auto rounded-panel border border-border">
            <table className="min-w-full border-collapse">
              <thead className="bg-background-elevated text-left text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-4 py-3">Week Label</th>
                  <th className="px-4 py-3">Budget Burn %</th>
                  <th className="px-4 py-3">Scope Completion %</th>
                  <th className="px-4 py-3">Schedule Health %</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {reportInput.healthHistory.map((row, index) => (
                  <tr key={`history-${index}`} className="border-b border-border hover:bg-background-elevated/50">
                    <td className="px-4 py-3 align-top">
                      <FormInput
                        id={`history-week-${index}`}
                        label=""
                        value={row.weekLabel}
                        error={errors[`history-${index}-weekLabel`]}
                        onChange={(event) => updateHistoryRow(index, "weekLabel", event.target.value)}
                        onBlur={() => validateHistoryRow(index)}
                        placeholder={`W${index + 1}`}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <FormInput
                        id={`history-budget-${index}`}
                        label=""
                        value={row.budgetBurnPercent}
                        inputMode="numeric"
                        error={errors[`history-${index}-budgetBurnPercent`]}
                        onChange={(event) => updateHistoryRow(index, "budgetBurnPercent", event.target.value)}
                        onBlur={() => validateHistoryRow(index)}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <FormInput
                        id={`history-scope-${index}`}
                        label=""
                        value={row.scopeCompletionPercent}
                        inputMode="numeric"
                        error={errors[`history-${index}-scopeCompletionPercent`]}
                        onChange={(event) => updateHistoryRow(index, "scopeCompletionPercent", event.target.value)}
                        onBlur={() => validateHistoryRow(index)}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <FormInput
                        id={`history-schedule-${index}`}
                        label=""
                        value={row.scheduleHealthPercent}
                        inputMode="numeric"
                        error={errors[`history-${index}-scheduleHealthPercent`]}
                        onChange={(event) => updateHistoryRow(index, "scheduleHealthPercent", event.target.value)}
                        onBlur={() => validateHistoryRow(index)}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <button
                        type="button"
                        disabled={reportInput.healthHistory.length <= 2}
                        onClick={() =>
                          setReportInput((previous) => ({
                            ...previous,
                            healthHistory: previous.healthHistory.filter((_, rowIndex) => rowIndex !== index),
                          }))
                        }
                        className="rounded-lg border border-border px-3 py-2 text-xs text-text-secondary enabled:hover:bg-background-elevated disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setReportInput((previous) => ({
                  ...previous,
                  healthHistory: [
                    ...previous.healthHistory,
                    {
                      weekLabel: "",
                      budgetBurnPercent: 0,
                      scopeCompletionPercent: 0,
                      scheduleHealthPercent: 0,
                    },
                  ],
                }))
              }
              className="rounded-[3px] border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-faint"
            >
              Add Row
            </button>
            {reportInput.healthHistory.length < 2 ? (
              <p className="text-xs text-rag-red">At least 2 history rows are required.</p>
            ) : null}
          </div>
        </SectionWrapper>

        <SectionWrapper
          title="Section C — Milestone Table"
          description="Baseline vs forecast milestones for schedule confidence tracking."
        >
          <div className="overflow-x-auto rounded-panel border border-border">
            <table className="min-w-full border-collapse">
              <thead className="bg-background-elevated text-left text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-4 py-3">Milestone Name</th>
                  <th className="px-4 py-3">Baseline Date</th>
                  <th className="px-4 py-3">Forecast Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Owner (Optional)</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {reportInput.milestones.map((row, index) => (
                  <tr key={`milestone-${index}`} className="border-b border-border hover:bg-background-elevated/50">
                    <td className="px-4 py-3 align-top">
                      <FormInput
                        id={`milestone-name-${index}`}
                        label=""
                        value={row.milestoneName}
                        error={errors[`milestone-${index}-milestoneName`]}
                        onChange={(event) => updateMilestoneRow(index, "milestoneName", event.target.value)}
                        onBlur={() => validateMilestoneRow(index)}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <FormDatePicker
                        id={`milestone-baseline-${index}`}
                        label=""
                        value={row.baselineDate}
                        error={errors[`milestone-${index}-baselineDate`]}
                        onChange={(event) => updateMilestoneRow(index, "baselineDate", event.target.value)}
                        onBlur={() => validateMilestoneRow(index)}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <FormDatePicker
                        id={`milestone-forecast-${index}`}
                        label=""
                        value={row.forecastDate}
                        error={errors[`milestone-${index}-forecastDate`]}
                        onChange={(event) => updateMilestoneRow(index, "forecastDate", event.target.value)}
                        onBlur={() => validateMilestoneRow(index)}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <FormSelect
                        id={`milestone-status-${index}`}
                        label=""
                        value={row.status}
                        options={[
                          { label: "Complete", value: "Complete" },
                          { label: "In Progress", value: "In Progress" },
                          { label: "Not Started", value: "Not Started" },
                          { label: "Delayed", value: "Delayed" },
                        ]}
                        onChange={(event) => updateMilestoneRow(index, "status", event.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <FormInput
                        id={`milestone-owner-${index}`}
                        label=""
                        value={row.owner ?? ""}
                        onChange={(event) => updateMilestoneRow(index, "owner", event.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <button
                        type="button"
                        disabled={reportInput.milestones.length <= 3}
                        onClick={() =>
                          setReportInput((previous) => ({
                            ...previous,
                            milestones: previous.milestones.filter((_, rowIndex) => rowIndex !== index),
                          }))
                        }
                        className="rounded-lg border border-border px-3 py-2 text-xs text-text-secondary enabled:hover:bg-background-elevated disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            {reportInput.milestones.length < 7 ? (
              <button
                type="button"
                onClick={() =>
                  setReportInput((previous) => ({
                    ...previous,
                    milestones: [
                      ...previous.milestones,
                      {
                        milestoneName: "",
                        baselineDate: "",
                        forecastDate: "",
                        status: "Not Started",
                        owner: "",
                      },
                    ],
                  }))
                }
                className="rounded-[3px] border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-faint"
              >
                Add Row
              </button>
            ) : (
              <p className="text-xs text-text-muted">Maximum 7 milestones reached.</p>
            )}
            {reportInput.milestones.length < 3 ? (
              <p className="text-xs text-rag-red">At least 3 milestones are required.</p>
            ) : null}
          </div>
        </SectionWrapper>

        <SectionWrapper
          title="Section D — Free Text Dump"
          description="Paste narrative context, escalations, and supporting notes."
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-text-primary" htmlFor="freeTextDump">
              Delivery Notes
              <span className="ml-1 text-rag-red">*</span>
            </label>
            <textarea
              id="freeTextDump"
              className={`min-h-[200px] resize-y rounded-lg border bg-background-elevated px-4 py-3 text-sm text-text-primary outline-none focus:border-accent-blue ${
                errors.freeTextDump ? "border-rag-red" : "border-border"
              }`}
              value={reportInput.freeTextDump}
              onChange={(event) => {
                setReportInput((previous) => ({ ...previous, freeTextDump: event.target.value }));
              }}
              onBlur={(event) => {
                validateField(
                  "freeTextDump",
                  event.target.value.trim().length >= 50
                    ? undefined
                    : "At least 50 characters are required for AI analysis.",
                );
                setShowDetailPrompt(event.target.value.trim().length < 150);
              }}
            />
            <p
              className={`text-xs ${
                reportInput.freeTextDump.length < 100
                  ? "text-rag-amber"
                  : reportInput.freeTextDump.length >= 200
                    ? "text-rag-green"
                    : "text-text-muted"
              }`}
            >
              {reportInput.freeTextDump.length} characters — more detail improves AI output
            </p>
            {showDetailPrompt ? (
              <p className="text-xs text-rag-amber">
                More detail here improves your AI-generated summary, risk analysis, and highlights.
              </p>
            ) : null}
            {errors.freeTextDump ? <p className="text-xs text-rag-red">{errors.freeTextDump}</p> : null}
          </div>
        </SectionWrapper>

        <SectionWrapper
          title="Section E — Workstream Table"
          description="Execution health by workstream."
          defaultOpen={false}
        >
          <div className="overflow-x-auto rounded-panel border border-border">
            <table className="min-w-full border-collapse">
              <thead className="bg-background-elevated text-left text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-4 py-3">Workstream*</th>
                  <th className="px-4 py-3">Planned*</th>
                  <th className="px-4 py-3">Actual*</th>
                  <th className="px-4 py-3">Tasks Planned*</th>
                  <th className="px-4 py-3">Tasks Completed*</th>
                  <th className="px-4 py-3">Velocity %</th>
                  <th className="px-4 py-3">Active Blockers</th>
                  <th className="px-4 py-3">Dependency*</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {reportInput.workstreams.map((row, index) => {
                  const velocity = row.tasksPlanned > 0 ? Math.round((row.tasksCompleted / row.tasksPlanned) * 100) : 0;
                  return (
                    <tr key={`workstream-${index}`} className="border-b border-border hover:bg-background-elevated/50">
                      <td className="px-4 py-3">
                        <input
                          className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                          value={row.workstreamName}
                          onChange={(event) =>
                            setReportInput((previous) => {
                              const next = [...previous.workstreams];
                              next[index] = { ...next[index], workstreamName: event.target.value };
                              return { ...previous, workstreams: next };
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                          inputMode="numeric"
                          value={row.plannedTeamSize}
                          onChange={(event) => {
                            if (!/^\d*$/.test(event.target.value)) return;
                            setReportInput((previous) => {
                              const next = [...previous.workstreams];
                              next[index] = { ...next[index], plannedTeamSize: Number(event.target.value || 0) };
                              return { ...previous, workstreams: next };
                            });
                          }}
                          onBlur={() => validatePositiveNumber(`workstream-planned-${index}`, row.plannedTeamSize)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                          inputMode="numeric"
                          value={row.actualTeamSize}
                          onChange={(event) => {
                            if (!/^\d*$/.test(event.target.value)) return;
                            setReportInput((previous) => {
                              const next = [...previous.workstreams];
                              next[index] = { ...next[index], actualTeamSize: Number(event.target.value || 0) };
                              return { ...previous, workstreams: next };
                            });
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                          inputMode="numeric"
                          value={row.tasksPlanned}
                          onChange={(event) => {
                            if (!/^\d*$/.test(event.target.value)) return;
                            setReportInput((previous) => {
                              const next = [...previous.workstreams];
                              next[index] = { ...next[index], tasksPlanned: Number(event.target.value || 0) };
                              return { ...previous, workstreams: next };
                            });
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                          inputMode="numeric"
                          value={row.tasksCompleted}
                          onChange={(event) => {
                            if (!/^\d*$/.test(event.target.value)) return;
                            setReportInput((previous) => {
                              const next = [...previous.workstreams];
                              next[index] = { ...next[index], tasksCompleted: Number(event.target.value || 0) };
                              return { ...previous, workstreams: next };
                            });
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary">{velocity}%</td>
                      <td className="px-4 py-3">
                        <textarea
                          className="min-h-16 w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                          value={row.activeBlockers ?? ""}
                          onChange={(event) =>
                            setReportInput((previous) => {
                              const next = [...previous.workstreams];
                              next[index] = { ...next[index], activeBlockers: event.target.value };
                              return { ...previous, workstreams: next };
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                          value={row.dependencyStatus}
                          onChange={(event) =>
                            setReportInput((previous) => {
                              const next = [...previous.workstreams];
                              next[index] = {
                                ...next[index],
                                dependencyStatus: event.target.value as "Clear" | "At Risk" | "Blocking",
                              };
                              return { ...previous, workstreams: next };
                            })
                          }
                        >
                          <option value="Clear">Clear</option>
                          <option value="At Risk">At Risk</option>
                          <option value="Blocking">Blocking</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={reportInput.workstreams.length <= 2}
                          className="rounded-lg border border-border px-3 py-2 text-xs text-text-secondary enabled:hover:bg-background-elevated disabled:opacity-50"
                          onClick={() =>
                            setReportInput((previous) => ({
                              ...previous,
                              workstreams: previous.workstreams.filter((_, rowIndex) => rowIndex !== index),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {reportInput.workstreams.length < 8 ? (
            <button
              type="button"
              className="mt-3 rounded-[3px] border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-faint"
              onClick={() =>
                setReportInput((previous) => ({
                  ...previous,
                  workstreams: [...previous.workstreams, emptyWorkstream],
                }))
              }
            >
              Add Workstream
            </button>
          ) : (
            <p className="mt-3 text-xs text-text-muted">Maximum 8 workstreams reached.</p>
          )}
        </SectionWrapper>

        <SectionWrapper
          title="Section F — RAID Log"
          description={`Total RAID items: ${
            reportInput.raid.risks.length +
            reportInput.raid.issues.length +
            reportInput.raid.dependencies.length +
            reportInput.raid.assumptions.length
          }`}
          defaultOpen={false}
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {([
              ["risks", "Risks", reportInput.raid.risks.length],
              ["issues", "Issues", reportInput.raid.issues.length],
              ["dependencies", "Dependencies", reportInput.raid.dependencies.length],
              ["assumptions", "Assumptions", reportInput.raid.assumptions.length],
            ] as const).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRaidTab(key)}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  raidTab === key ? "border-ink bg-ink text-cream" : "border-border text-text-secondary"
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          {raidTab === "risks" ? (
            <div className="space-y-3">
              {reportInput.raid.risks.map((risk, index) => (
                <div key={`risk-${index}`} className="rounded-panel border border-border p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormInput
                      id={`risk-desc-${index}`}
                      label="Risk Description"
                      value={risk.riskDescription}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.risks];
                          next[index] = { ...next[index], riskDescription: event.target.value };
                          return { ...previous, raid: { ...previous.raid, risks: next } };
                        })
                      }
                    />
                    <FormInput
                      id={`risk-linked-${index}`}
                      label="Linked Milestone"
                      value={risk.linkedMilestone ?? ""}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.risks];
                          next[index] = { ...next[index], linkedMilestone: event.target.value };
                          return { ...previous, raid: { ...previous.raid, risks: next } };
                        })
                      }
                    />
                    <FormSelect
                      id={`risk-probability-${index}`}
                      label="Probability"
                      value={risk.probability}
                      options={[
                        { label: "Low", value: "L" },
                        { label: "Medium", value: "M" },
                        { label: "High", value: "H" },
                      ]}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.risks];
                          next[index] = { ...next[index], probability: event.target.value as "L" | "M" | "H" };
                          return { ...previous, raid: { ...previous.raid, risks: next } };
                        })
                      }
                    />
                    <FormSelect
                      id={`risk-impact-${index}`}
                      label="Impact"
                      value={risk.impact}
                      options={[
                        { label: "Low", value: "L" },
                        { label: "Medium", value: "M" },
                        { label: "High", value: "H" },
                      ]}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.risks];
                          next[index] = { ...next[index], impact: event.target.value as "L" | "M" | "H" };
                          return { ...previous, raid: { ...previous.raid, risks: next } };
                        })
                      }
                    />
                    <FormInput
                      id={`risk-owner-${index}`}
                      label="Owner"
                      value={risk.owner ?? ""}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.risks];
                          next[index] = { ...next[index], owner: event.target.value };
                          return { ...previous, raid: { ...previous.raid, risks: next } };
                        })
                      }
                    />
                    <FormInput
                      id={`risk-mitigation-${index}`}
                      label="Mitigation Action"
                      value={risk.mitigationAction ?? ""}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.risks];
                          next[index] = { ...next[index], mitigationAction: event.target.value };
                          return { ...previous, raid: { ...previous.raid, risks: next } };
                        })
                      }
                    />
                    <FormInput
                      id={`risk-status-${index}`}
                      label="Status"
                      value={risk.status}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.risks];
                          next[index] = { ...next[index], status: event.target.value };
                          return { ...previous, raid: { ...previous.raid, risks: next } };
                        })
                      }
                    />
                  </div>
                  {!risk.owner?.trim() && !risk.mitigationAction?.trim() ? (
                    <p className="mt-2 text-xs text-rag-amber">⚠️ Unowned/Unmitigated — will be flagged in RAID slide</p>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                className="rounded-[3px] border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-faint"
                onClick={() =>
                  setReportInput((previous) => ({
                    ...previous,
                    raid: {
                      ...previous.raid,
                      risks: [
                        ...previous.raid.risks,
                        {
                          riskDescription: "",
                          probability: "M",
                          impact: "M",
                          owner: "",
                          mitigationAction: "",
                          status: "",
                          linkedMilestone: "",
                        } as RiskItem,
                      ],
                    },
                  }))
                }
              >
                Add Risk
              </button>
            </div>
          ) : null}
          {raidTab === "issues" ? (
            <div className="space-y-3">
              {reportInput.raid.issues.map((issue, index) => (
                <div key={`issue-${index}`} className="rounded-panel border border-border p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormInput
                      id={`issue-desc-${index}`}
                      label="Description"
                      value={issue.description}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.issues];
                          next[index] = { ...next[index], description: event.target.value };
                          return { ...previous, raid: { ...previous.raid, issues: next } };
                        })
                      }
                    />
                    <FormSelect
                      id={`issue-severity-${index}`}
                      label="Severity"
                      value={issue.severity}
                      options={[
                        { label: "Low", value: "L" },
                        { label: "Medium", value: "M" },
                        { label: "High", value: "H" },
                        { label: "Critical", value: "Critical" },
                      ]}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.issues];
                          next[index] = { ...next[index], severity: event.target.value as "L" | "M" | "H" | "Critical" };
                          return { ...previous, raid: { ...previous.raid, issues: next } };
                        })
                      }
                    />
                    <FormDatePicker
                      id={`issue-date-${index}`}
                      label="Date Raised"
                      value={issue.dateRaised}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.issues];
                          next[index] = { ...next[index], dateRaised: event.target.value };
                          return { ...previous, raid: { ...previous.raid, issues: next } };
                        })
                      }
                    />
                    <FormInput
                      id={`issue-owner-${index}`}
                      label="Owner"
                      value={issue.owner ?? ""}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.issues];
                          next[index] = { ...next[index], owner: event.target.value };
                          return { ...previous, raid: { ...previous.raid, issues: next } };
                        })
                      }
                    />
                    <FormInput
                      id={`issue-status-${index}`}
                      label="Status"
                      value={issue.status}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.issues];
                          next[index] = { ...next[index], status: event.target.value };
                          return { ...previous, raid: { ...previous.raid, issues: next } };
                        })
                      }
                    />
                    <FormInput
                      id={`issue-linked-${index}`}
                      label="Linked Decision"
                      value={issue.linkedDecision ?? ""}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.issues];
                          next[index] = { ...next[index], linkedDecision: event.target.value };
                          return { ...previous, raid: { ...previous.raid, issues: next } };
                        })
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="mt-3 rounded-lg border border-border px-3 py-2 text-xs text-text-secondary hover:bg-background-elevated"
                    onClick={() =>
                      setReportInput((previous) => ({
                        ...previous,
                        raid: { ...previous.raid, issues: previous.raid.issues.filter((_, rowIndex) => rowIndex !== index) },
                      }))
                    }
                  >
                    Remove Issue
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="rounded-[3px] border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-faint"
                onClick={() =>
                  setReportInput((previous) => ({
                    ...previous,
                    raid: {
                      ...previous.raid,
                      issues: [
                        ...previous.raid.issues,
                        {
                          description: "",
                          severity: "M",
                          dateRaised: "",
                          owner: "",
                          status: "",
                          linkedDecision: "",
                        },
                      ],
                    },
                  }))
                }
              >
                Add Issue
              </button>
            </div>
          ) : null}

          {raidTab === "dependencies" ? (
            <div className="space-y-3">
              {reportInput.raid.dependencies.map((dependency, index) => (
                <div key={`dependency-${index}`} className="rounded-panel border border-border p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormInput
                      id={`dependency-desc-${index}`}
                      label="Description"
                      value={dependency.description}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.dependencies];
                          next[index] = { ...next[index], description: event.target.value };
                          return { ...previous, raid: { ...previous.raid, dependencies: next } };
                        })
                      }
                    />
                    <FormInput
                      id={`dependency-type-${index}`}
                      label="Type"
                      value={dependency.type}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.dependencies];
                          next[index] = { ...next[index], type: event.target.value };
                          return { ...previous, raid: { ...previous.raid, dependencies: next } };
                        })
                      }
                    />
                    <FormDatePicker
                      id={`dependency-due-${index}`}
                      label="Due Date"
                      value={dependency.dueDate}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.dependencies];
                          next[index] = { ...next[index], dueDate: event.target.value };
                          return { ...previous, raid: { ...previous.raid, dependencies: next } };
                        })
                      }
                    />
                    <FormInput
                      id={`dependency-status-${index}`}
                      label="Status"
                      value={dependency.status}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.dependencies];
                          next[index] = { ...next[index], status: event.target.value };
                          return { ...previous, raid: { ...previous.raid, dependencies: next } };
                        })
                      }
                    />
                    <FormInput
                      id={`dependency-owner-${index}`}
                      label="Owner"
                      value={dependency.owner ?? ""}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.dependencies];
                          next[index] = { ...next[index], owner: event.target.value };
                          return { ...previous, raid: { ...previous.raid, dependencies: next } };
                        })
                      }
                    />
                    <FormInput
                      id={`dependency-blocking-${index}`}
                      label="Blocking What"
                      value={dependency.blockingWhat}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.dependencies];
                          next[index] = { ...next[index], blockingWhat: event.target.value };
                          return { ...previous, raid: { ...previous.raid, dependencies: next } };
                        })
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="mt-3 rounded-lg border border-border px-3 py-2 text-xs text-text-secondary hover:bg-background-elevated"
                    onClick={() =>
                      setReportInput((previous) => ({
                        ...previous,
                        raid: {
                          ...previous.raid,
                          dependencies: previous.raid.dependencies.filter((_, rowIndex) => rowIndex !== index),
                        },
                      }))
                    }
                  >
                    Remove Dependency
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="rounded-[3px] border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-faint"
                onClick={() =>
                  setReportInput((previous) => ({
                    ...previous,
                    raid: {
                      ...previous.raid,
                      dependencies: [
                        ...previous.raid.dependencies,
                        {
                          description: "",
                          type: "",
                          dueDate: "",
                          status: "",
                          owner: "",
                          blockingWhat: "",
                        },
                      ],
                    },
                  }))
                }
              >
                Add Dependency
              </button>
            </div>
          ) : null}

          {raidTab === "assumptions" ? (
            <div className="space-y-3">
              {reportInput.raid.assumptions.map((assumption, index) => (
                <div key={`assumption-${index}`} className="rounded-panel border border-border p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormInput
                      id={`assumption-statement-${index}`}
                      label="Statement"
                      value={assumption.statement}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.assumptions];
                          next[index] = { ...next[index], statement: event.target.value };
                          return { ...previous, raid: { ...previous.raid, assumptions: next } };
                        })
                      }
                    />
                    <div className="flex items-center gap-3 pt-7">
                      <input
                        id={`assumption-validated-${index}`}
                        type="checkbox"
                        checked={assumption.validated}
                        onChange={(event) =>
                          setReportInput((previous) => {
                            const next = [...previous.raid.assumptions];
                            next[index] = { ...next[index], validated: event.target.checked };
                            return { ...previous, raid: { ...previous.raid, assumptions: next } };
                          })
                        }
                      />
                      <label className="text-sm text-text-primary" htmlFor={`assumption-validated-${index}`}>
                        Validated
                      </label>
                    </div>
                    <FormInput
                      id={`assumption-impact-${index}`}
                      label="Impact If Wrong"
                      value={assumption.impactIfWrong}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.assumptions];
                          next[index] = { ...next[index], impactIfWrong: event.target.value };
                          return { ...previous, raid: { ...previous.raid, assumptions: next } };
                        })
                      }
                    />
                    <FormInput
                      id={`assumption-owner-${index}`}
                      label="Owner"
                      value={assumption.owner ?? ""}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...previous.raid.assumptions];
                          next[index] = { ...next[index], owner: event.target.value };
                          return { ...previous, raid: { ...previous.raid, assumptions: next } };
                        })
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="mt-3 rounded-lg border border-border px-3 py-2 text-xs text-text-secondary hover:bg-background-elevated"
                    onClick={() =>
                      setReportInput((previous) => ({
                        ...previous,
                        raid: {
                          ...previous.raid,
                          assumptions: previous.raid.assumptions.filter((_, rowIndex) => rowIndex !== index),
                        },
                      }))
                    }
                  >
                    Remove Assumption
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="rounded-[3px] border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-faint"
                onClick={() =>
                  setReportInput((previous) => ({
                    ...previous,
                    raid: {
                      ...previous.raid,
                      assumptions: [
                        ...previous.raid.assumptions,
                        { statement: "", validated: false, impactIfWrong: "", owner: "" },
                      ],
                    },
                  }))
                }
              >
                Add Assumption
              </button>
            </div>
          ) : null}
        </SectionWrapper>

        <SectionWrapper title="Section G — Commercial Data" description="Engagement and financial controls." defaultOpen={false}>
          <div className="mb-4 flex w-fit rounded-lg border border-border p-1">
            <button
              type="button"
              className={`rounded-md px-4 py-2 text-sm ${
                reportInput.commercialData.engagementModel === "TNM" ? "bg-ink text-cream" : "text-text-secondary"
              }`}
              onClick={() =>
                setReportInput((previous) => ({
                  ...previous,
                  commercialData: { ...previous.commercialData, engagementModel: "TNM" },
                }))
              }
            >
              Time & Material
            </button>
            <button
              type="button"
              className={`rounded-md px-4 py-2 text-sm ${
                reportInput.commercialData.engagementModel === "FP" ? "bg-ink text-cream" : "text-text-secondary"
              }`}
              onClick={() =>
                setReportInput((previous) => ({
                  ...previous,
                  commercialData: { ...previous.commercialData, engagementModel: "FP" },
                }))
              }
            >
              Fixed Price
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              id="originalContractValue"
              label="Original Contract Value"
              mandatory
              value={reportInput.commercialData.originalContractValue}
              inputMode="numeric"
              onChange={(event) =>
                setReportInput((previous) => ({
                  ...previous,
                  commercialData: { ...previous.commercialData, originalContractValue: Number(event.target.value || 0) },
                }))
              }
            />
            <FormSelect
              id="currency"
              label="Currency"
              mandatory
              value={reportInput.commercialData.currency}
              options={[
                { label: "USD", value: "USD" },
                { label: "GBP", value: "GBP" },
                { label: "EUR", value: "EUR" },
                { label: "INR", value: "INR" },
              ]}
              onChange={(event) =>
                setReportInput((previous) => ({
                  ...previous,
                  commercialData: { ...previous.commercialData, currency: event.target.value as "USD" | "GBP" | "EUR" | "INR" },
                }))
              }
            />
            <FormDatePicker
              id="engagementStart"
              label="Engagement Start"
              mandatory
              value={reportInput.commercialData.engagementStart}
              onChange={(event) =>
                setReportInput((previous) => ({
                  ...previous,
                  commercialData: { ...previous.commercialData, engagementStart: event.target.value },
                }))
              }
            />
            <FormDatePicker
              id="engagementEnd"
              label="Engagement End"
              mandatory
              value={reportInput.commercialData.engagementEnd}
              onChange={(event) =>
                setReportInput((previous) => ({
                  ...previous,
                  commercialData: { ...previous.commercialData, engagementEnd: event.target.value },
                }))
              }
            />
          </div>
          {reportInput.commercialData.engagementModel === "TNM" ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <FormInput
                  id="totalApprovedHours"
                  label="Total Approved Hours"
                  mandatory
                  value={reportInput.commercialData.totalApprovedHours ?? 0}
                  inputMode="numeric"
                  onChange={(event) =>
                    setReportInput((previous) => ({
                      ...previous,
                      commercialData: {
                        ...previous.commercialData,
                        totalApprovedHours: Number(event.target.value || 0),
                      },
                    }))
                  }
                />
                <FormInput
                  id="hoursConsumedToDate"
                  label="Hours Consumed to Date"
                  mandatory
                  value={reportInput.commercialData.hoursConsumedToDate ?? 0}
                  inputMode="numeric"
                  onChange={(event) =>
                    setReportInput((previous) => ({
                      ...previous,
                      commercialData: {
                        ...previous.commercialData,
                        hoursConsumedToDate: Number(event.target.value || 0),
                      },
                    }))
                  }
                />
                <FormInput
                  id="plannedWeeklyBurnRate"
                  label="Planned Weekly Burn Rate"
                  mandatory
                  value={reportInput.commercialData.plannedWeeklyBurnRate ?? 0}
                  inputMode="numeric"
                  onChange={(event) =>
                    setReportInput((previous) => ({
                      ...previous,
                      commercialData: {
                        ...previous.commercialData,
                        plannedWeeklyBurnRate: Number(event.target.value || 0),
                      },
                    }))
                  }
                />
              </div>
              <div className="rounded-panel border border-border p-4">
                <p className="mb-2 text-sm font-semibold text-text-primary">Combined History (min 3 rows)</p>
                {(reportInput.commercialData.tnmHistory ?? []).map((row, index) => (
                  <div key={`tnm-history-${index}`} className="mb-2 grid gap-2 md:grid-cols-4">
                    <input
                      className="rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
                      value={row.weekLabel}
                      placeholder="Week Label"
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...(previous.commercialData.tnmHistory ?? [])];
                          next[index] = { ...next[index], weekLabel: event.target.value };
                          return { ...previous, commercialData: { ...previous.commercialData, tnmHistory: next } };
                        })
                      }
                    />
                    <input
                      className="rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
                      inputMode="numeric"
                      value={row.actualCostThatWeek ?? 0}
                      placeholder="Actual Cost"
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...(previous.commercialData.tnmHistory ?? [])];
                          next[index] = { ...next[index], actualCostThatWeek: Number(event.target.value || 0) };
                          return { ...previous, commercialData: { ...previous.commercialData, tnmHistory: next } };
                        })
                      }
                    />
                    <input
                      className="rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
                      inputMode="numeric"
                      value={row.eacAtEndOfWeek ?? 0}
                      placeholder="EAC End of Week"
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...(previous.commercialData.tnmHistory ?? [])];
                          next[index] = { ...next[index], eacAtEndOfWeek: Number(event.target.value || 0) };
                          return { ...previous, commercialData: { ...previous.commercialData, tnmHistory: next } };
                        })
                      }
                    />
                    <button
                      type="button"
                      disabled={(reportInput.commercialData.tnmHistory ?? []).length <= 3}
                      className="rounded-lg border border-border px-3 py-2 text-xs text-text-secondary disabled:opacity-50"
                      onClick={() =>
                        setReportInput((previous) => ({
                          ...previous,
                          commercialData: {
                            ...previous.commercialData,
                            tnmHistory: (previous.commercialData.tnmHistory ?? []).filter(
                              (_, rowIndex) => rowIndex !== index,
                            ),
                          },
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormInput
                  id="internalCostToDate"
                  label="Internal Cost to Date"
                  mandatory
                  value={reportInput.commercialData.internalCostToDate ?? 0}
                  inputMode="numeric"
                  onChange={(event) =>
                    setReportInput((previous) => ({
                      ...previous,
                      commercialData: {
                        ...previous.commercialData,
                        internalCostToDate: Number(event.target.value || 0),
                      },
                    }))
                  }
                />
                <FormInput
                  id="forecastFinalInternalCost"
                  label="Forecast Final Internal Cost"
                  mandatory
                  value={reportInput.commercialData.forecastFinalInternalCost ?? 0}
                  inputMode="numeric"
                  onChange={(event) =>
                    setReportInput((previous) => ({
                      ...previous,
                      commercialData: {
                        ...previous.commercialData,
                        forecastFinalInternalCost: Number(event.target.value || 0),
                      },
                    }))
                  }
                />
              </div>
              <div className="rounded-panel border border-border p-4">
                <p className="mb-2 text-sm font-semibold text-text-primary">Milestone Billing (min 2 rows)</p>
                {(reportInput.commercialData.milestoneBilling ?? []).map((row, index) => (
                  <div key={`billing-${index}`} className="mb-2 grid gap-2 md:grid-cols-5">
                    <input
                      className="rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
                      value={row.milestoneName}
                      placeholder="Milestone"
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...(previous.commercialData.milestoneBilling ?? [])];
                          next[index] = { ...next[index], milestoneName: event.target.value };
                          return {
                            ...previous,
                            commercialData: { ...previous.commercialData, milestoneBilling: next },
                          };
                        })
                      }
                    />
                    <input
                      className="rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
                      inputMode="numeric"
                      value={row.billingValue}
                      placeholder="Value"
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...(previous.commercialData.milestoneBilling ?? [])];
                          next[index] = { ...next[index], billingValue: Number(event.target.value || 0) };
                          return {
                            ...previous,
                            commercialData: { ...previous.commercialData, milestoneBilling: next },
                          };
                        })
                      }
                    />
                    <input
                      type="date"
                      className="rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
                      value={row.dueDate}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...(previous.commercialData.milestoneBilling ?? [])];
                          next[index] = { ...next[index], dueDate: event.target.value };
                          return {
                            ...previous,
                            commercialData: { ...previous.commercialData, milestoneBilling: next },
                          };
                        })
                      }
                    />
                    <select
                      className="rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
                      value={row.status}
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...(previous.commercialData.milestoneBilling ?? [])];
                          next[index] = {
                            ...next[index],
                            status: event.target.value as "Scheduled" | "Due" | "Paid" | "Overdue",
                          };
                          return {
                            ...previous,
                            commercialData: { ...previous.commercialData, milestoneBilling: next },
                          };
                        })
                      }
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Due">Due</option>
                      <option value="Paid">Paid</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                    <button
                      type="button"
                      disabled={(reportInput.commercialData.milestoneBilling ?? []).length <= 2}
                      className="rounded-lg border border-border px-3 py-2 text-xs text-text-secondary disabled:opacity-50"
                      onClick={() =>
                        setReportInput((previous) => ({
                          ...previous,
                          commercialData: {
                            ...previous.commercialData,
                            milestoneBilling: (previous.commercialData.milestoneBilling ?? []).filter(
                              (_, rowIndex) => rowIndex !== index,
                            ),
                          },
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="rounded-panel border border-border p-4">
                <p className="mb-2 text-sm font-semibold text-text-primary">Combined History (min 3 rows)</p>
                {(reportInput.commercialData.fpHistory ?? []).map((row, index) => (
                  <div key={`fp-history-${index}`} className="mb-2 grid gap-2 md:grid-cols-4">
                    <input
                      className="rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
                      value={row.weekLabel}
                      placeholder="Week Label"
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...(previous.commercialData.fpHistory ?? [])];
                          next[index] = { ...next[index], weekLabel: event.target.value };
                          return { ...previous, commercialData: { ...previous.commercialData, fpHistory: next } };
                        })
                      }
                    />
                    <input
                      className="rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
                      inputMode="numeric"
                      value={row.internalCost ?? 0}
                      placeholder="Internal Cost"
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...(previous.commercialData.fpHistory ?? [])];
                          next[index] = { ...next[index], internalCost: Number(event.target.value || 0) };
                          return { ...previous, commercialData: { ...previous.commercialData, fpHistory: next } };
                        })
                      }
                    />
                    <input
                      className="rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
                      inputMode="numeric"
                      value={row.forecastFinalCost ?? 0}
                      placeholder="Forecast Final Cost"
                      onChange={(event) =>
                        setReportInput((previous) => {
                          const next = [...(previous.commercialData.fpHistory ?? [])];
                          next[index] = { ...next[index], forecastFinalCost: Number(event.target.value || 0) };
                          return { ...previous, commercialData: { ...previous.commercialData, fpHistory: next } };
                        })
                      }
                    />
                    <button
                      type="button"
                      disabled={(reportInput.commercialData.fpHistory ?? []).length <= 3}
                      className="rounded-lg border border-border px-3 py-2 text-xs text-text-secondary disabled:opacity-50"
                      onClick={() =>
                        setReportInput((previous) => ({
                          ...previous,
                          commercialData: {
                            ...previous.commercialData,
                            fpHistory: (previous.commercialData.fpHistory ?? []).filter(
                              (_, rowIndex) => rowIndex !== index,
                            ),
                          },
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 rounded-panel border border-border p-4">
            <h3 className="text-sm font-semibold text-text-primary">Change Requests</h3>
            <p className="mt-2 text-xs text-text-muted">
              Impact column switches with engagement model:{" "}
              {reportInput.commercialData.engagementModel === "TNM" ? "Hours Impact" : "Scope Impact"}.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-background-elevated text-left text-xs uppercase tracking-wider text-text-muted">
                  <tr>
                    <th className="px-4 py-3">CR ID</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Value Impact</th>
                    <th className="px-4 py-3">
                      {reportInput.commercialData.engagementModel === "TNM" ? "Hours Impact" : "Scope Impact"}
                    </th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Commercial Impact Narrative</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportInput.commercialData.changeRequests.map((row, index) => (
                    <tr key={`cr-${index}`} className="border-b border-border hover:bg-background-elevated/50">
                      <td className="px-4 py-3">
                        <input
                          className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
                          value={row.crId}
                          onChange={(event) =>
                            setReportInput((previous) => {
                              const next = [...previous.commercialData.changeRequests];
                              next[index] = { ...next[index], crId: event.target.value };
                              return { ...previous, commercialData: { ...previous.commercialData, changeRequests: next } };
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
                          value={row.description}
                          onChange={(event) =>
                            setReportInput((previous) => {
                              const next = [...previous.commercialData.changeRequests];
                              next[index] = { ...next[index], description: event.target.value };
                              return { ...previous, commercialData: { ...previous.commercialData, changeRequests: next } };
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
                          inputMode="numeric"
                          value={row.valueImpact}
                          onChange={(event) =>
                            setReportInput((previous) => {
                              const next = [...previous.commercialData.changeRequests];
                              next[index] = { ...next[index], valueImpact: Number(event.target.value || 0) };
                              return { ...previous, commercialData: { ...previous.commercialData, changeRequests: next } };
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
                          value={row.modelImpact}
                          onChange={(event) =>
                            setReportInput((previous) => {
                              const next = [...previous.commercialData.changeRequests];
                              next[index] = { ...next[index], modelImpact: event.target.value };
                              return { ...previous, commercialData: { ...previous.commercialData, changeRequests: next } };
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
                          value={row.status}
                          onChange={(event) =>
                            setReportInput((previous) => {
                              const next = [...previous.commercialData.changeRequests];
                              next[index] = {
                                ...next[index],
                                status: event.target.value as "Approved" | "Pending" | "Rejected",
                              };
                              return { ...previous, commercialData: { ...previous.commercialData, changeRequests: next } };
                            })
                          }
                        >
                          <option value="Approved">Approved</option>
                          <option value="Pending">Pending</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
                          value={row.commercialImpactNarrative ?? ""}
                          onChange={(event) =>
                            setReportInput((previous) => {
                              const next = [...previous.commercialData.changeRequests];
                              next[index] = { ...next[index], commercialImpactNarrative: event.target.value };
                              return { ...previous, commercialData: { ...previous.commercialData, changeRequests: next } };
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="rounded-lg border border-border px-3 py-2 text-xs text-text-secondary hover:bg-background-elevated"
                          onClick={() =>
                            setReportInput((previous) => ({
                              ...previous,
                              commercialData: {
                                ...previous.commercialData,
                                changeRequests: previous.commercialData.changeRequests.filter(
                                  (_, rowIndex) => rowIndex !== index,
                                ),
                              },
                            }))
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className="mt-3 rounded-[3px] border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-faint"
              onClick={() =>
                setReportInput((previous) => ({
                  ...previous,
                  commercialData: {
                    ...previous.commercialData,
                    changeRequests: [
                      ...previous.commercialData.changeRequests,
                      {
                        crId: "",
                        description: "",
                        valueImpact: 0,
                        modelImpact: "",
                        status: "Pending",
                        commercialImpactNarrative: "",
                      },
                    ],
                  },
                }))
              }
            >
              Add CR
            </button>
          </div>
        </SectionWrapper>

        <SectionWrapper title="Section H — Decisions" description="Leadership decisions and due dates." defaultOpen={false}>
          <div className="mt-3 overflow-x-auto rounded-panel border border-border">
            <table className="min-w-full border-collapse">
              <thead className="bg-background-elevated text-left text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-4 py-3">Decision Title</th>
                  <th className="px-4 py-3">Owner Name + Role</th>
                  <th className="px-4 py-3">Owner Organisation</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Impact if Delayed</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {reportInput.decisions.map((decision, index) => (
                  <tr key={`decision-${index}`} className="border-b border-border hover:bg-background-elevated/50">
                    <td className="px-4 py-3">
                      <input
                        className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                        value={decision.decisionTitle}
                        onChange={(event) =>
                          setReportInput((previous) => {
                            const next = [...previous.decisions];
                            next[index] = { ...next[index], decisionTitle: event.target.value };
                            return { ...previous, decisions: next };
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                        value={decision.ownerNameRole}
                        onChange={(event) =>
                          setReportInput((previous) => {
                            const next = [...previous.decisions];
                            next[index] = { ...next[index], ownerNameRole: event.target.value };
                            return { ...previous, decisions: next };
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                        value={decision.ownerOrganisation}
                        onChange={(event) =>
                          setReportInput((previous) => {
                            const next = [...previous.decisions];
                            next[index] = { ...next[index], ownerOrganisation: event.target.value };
                            return { ...previous, decisions: next };
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                        value={decision.dueDate}
                        onChange={(event) =>
                          setReportInput((previous) => {
                            const next = [...previous.decisions];
                            next[index] = { ...next[index], dueDate: event.target.value };
                            return { ...previous, decisions: next };
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                        value={decision.priority}
                        onChange={(event) =>
                          setReportInput((previous) => {
                            const next = [...previous.decisions];
                            next[index] = {
                              ...next[index],
                              priority: event.target.value as "Critical" | "High" | "Normal",
                            };
                            return { ...previous, decisions: next };
                          })
                        }
                      >
                        <option value="Critical">Critical (Red)</option>
                        <option value="High">High (Amber)</option>
                        <option value="Normal">Normal (Blue)</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                        value={decision.impactIfDelayed ?? ""}
                        onChange={(event) =>
                          setReportInput((previous) => {
                            const next = [...previous.decisions];
                            next[index] = { ...next[index], impactIfDelayed: event.target.value };
                            return { ...previous, decisions: next };
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="rounded-lg border border-border px-3 py-2 text-xs text-text-secondary hover:bg-background-elevated"
                        onClick={() =>
                          setReportInput((previous) => ({
                            ...previous,
                            decisions: previous.decisions.filter((_, rowIndex) => rowIndex !== index),
                          }))
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="rounded-[3px] border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-faint"
            onClick={() =>
              setReportInput((previous) => ({
                ...previous,
                decisions: [
                  ...previous.decisions,
                  {
                    decisionTitle: "",
                    ownerNameRole: "",
                    ownerOrganisation: "",
                    dueDate: "",
                    priority: "Normal",
                    impactIfDelayed: "",
                  },
                ],
              }))
            }
          >
            Add Decision
          </button>
        </SectionWrapper>

        <div className="sticky bottom-3 z-20 rounded-panel border border-border bg-background-card/95 p-4 backdrop-blur">
          {submitError ? (
            <p className="mb-3 rounded-lg border border-rag-red bg-rag-red/10 px-3 py-2 text-sm text-rag-red">
              {submitError}
              {quotaExceeded ? (
                <>
                  {" "}
                  <Link href={BILLING_UPGRADE_PATH} className="font-semibold underline">
                    Upgrade to Pro
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}

          {pendingOutput ? (
            <div className="mb-3 rounded-panel border border-border bg-background-elevated p-4">
              <p className="text-sm font-semibold text-text-primary">AI-suggested RAG: {pendingOutput.rag_status}</p>
              <p className="mt-1 text-xs text-text-secondary">{pendingOutput.rag_reason}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {(["RED", "AMBER", "GREEN"] as const).map((rag) => (
                  <button
                    key={rag}
                    type="button"
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      overrideRag === rag
                        ? "border-ink bg-ink text-cream"
                        : "border-border text-text-secondary"
                    }`}
                    onClick={() => setOverrideRag(rag)}
                  >
                    {rag}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-xs text-text-secondary" htmlFor="override-rag-reason">
                  PM Reason (editable)
                </label>
                <textarea
                  id="override-rag-reason"
                  className="min-h-20 w-full rounded-lg border border-border bg-background-card px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                  value={overrideReason}
                  onChange={(event) => setOverrideReason(event.target.value)}
                />
              </div>
            </div>
          ) : null}

          <button
            type="button"
            disabled={(completedCount !== 8 || isGenerating) && !pendingOutput}
            onClick={pendingOutput ? handleConfirmAndViewReport : handleGenerateReport}
            className={`w-full rounded-[3px] px-4 py-3 text-sm font-semibold ${
              (completedCount === 8 || Boolean(pendingOutput)) && !isGenerating
                ? "bg-ink text-cream hover:bg-black"
                : "cursor-not-allowed bg-text-muted text-cream"
            }`}
          >
            {pendingOutput
              ? "Confirm & View Report"
              : isGenerating
                ? "Analysing your project data..."
                : "Generate Report →"}
          </button>
        </div>
      </div>
    </main>
  );
}
