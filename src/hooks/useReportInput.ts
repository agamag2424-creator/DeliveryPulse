// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.

"use client";

import { useState } from "react";

import { cloudBridgeSampleReportInput } from "@/data/cloudbridge-sample";
import type { ReportInput } from "@/types/report";

const emptyReportInputState: ReportInput = {
  projectData: {
    projectName: "",
    clientName: "",
    reportingPeriodFrom: "",
    reportingPeriodTo: "",
    deliveryPMName: "",
    currentProjectPhase: "Initiation",
  },
  healthData: {
    currentBudgetBurnPercent: -1,
    currentScopeCompletionPercent: -1,
    currentScheduleHealthPercent: -1,
    activeWorkstreams: undefined,
    teamSize: undefined,
  },
  healthHistory: [
    { weekLabel: "", budgetBurnPercent: 0, scopeCompletionPercent: 0, scheduleHealthPercent: 0 },
    { weekLabel: "", budgetBurnPercent: 0, scopeCompletionPercent: 0, scheduleHealthPercent: 0 },
  ],
  milestones: [
    { milestoneName: "", baselineDate: "", forecastDate: "", status: "Not Started", owner: "" },
    { milestoneName: "", baselineDate: "", forecastDate: "", status: "Not Started", owner: "" },
    { milestoneName: "", baselineDate: "", forecastDate: "", status: "Not Started", owner: "" },
  ],
  freeTextDump: "",
  workstreams: [
    {
      workstreamName: "",
      plannedTeamSize: 0,
      actualTeamSize: 0,
      tasksPlanned: 0,
      tasksCompleted: 0,
      activeBlockers: "",
      dependencyStatus: "Clear",
      blockers: [],
    },
    {
      workstreamName: "",
      plannedTeamSize: 0,
      actualTeamSize: 0,
      tasksPlanned: 0,
      tasksCompleted: 0,
      activeBlockers: "",
      dependencyStatus: "Clear",
      blockers: [],
    },
  ],
  raid: {
    risks: [],
    issues: [],
    dependencies: [],
    assumptions: [],
  },
  commercialData: {
    engagementModel: "TNM",
    originalContractValue: 0,
    currency: "USD",
    engagementStart: "",
    engagementEnd: "",
    totalApprovedHours: 0,
    hoursConsumedToDate: 0,
    plannedWeeklyBurnRate: 0,
    internalCostToDate: 0,
    forecastFinalInternalCost: 0,
    tnmHistory: [
      { weekLabel: "", actualCostThatWeek: 0, eacAtEndOfWeek: 0 },
      { weekLabel: "", actualCostThatWeek: 0, eacAtEndOfWeek: 0 },
      { weekLabel: "", actualCostThatWeek: 0, eacAtEndOfWeek: 0 },
    ],
    fpHistory: [
      { weekLabel: "", internalCost: 0, forecastFinalCost: 0 },
      { weekLabel: "", internalCost: 0, forecastFinalCost: 0 },
      { weekLabel: "", internalCost: 0, forecastFinalCost: 0 },
    ],
    milestoneBilling: [
      { milestoneName: "", billingValue: 0, dueDate: "", status: "Scheduled" },
      { milestoneName: "", billingValue: 0, dueDate: "", status: "Scheduled" },
    ],
    changeRequests: [],
  },
  decisions: [],
};

function cloneReportInput(input: ReportInput): ReportInput {
  return structuredClone(input);
}

const sampleReportInputState = cloneReportInput(cloudBridgeSampleReportInput);

export function useReportInput(initialState?: ReportInput) {
  const baseState = initialState ?? emptyReportInputState;
  const [reportInput, setReportInput] = useState<ReportInput>(cloneReportInput(baseState));

  return {
    reportInput,
    setReportInput,
    resetReportInput: () => setReportInput(cloneReportInput(baseState)),
  };
}

export { sampleReportInputState, emptyReportInputState };
