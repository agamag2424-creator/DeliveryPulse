import type { ReportInput } from "@/types/report";

/** Server-side empty ReportInput template — mirrors useReportInput empty state. */
export function createEmptyReportInput(): ReportInput {
  return {
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
}

export function getCurrentReportingWeek(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const format = (date: Date) => date.toISOString().slice(0, 10);
  return { from: format(monday), to: format(sunday) };
}
