import type { NormalisedTaskData } from "@/lib/connectors/types";
import type { ReportInput } from "@/types/report";

import type { CompletenessReport, Gap } from "./types";

interface MandatoryField {
  field: string;
  label: string;
  isCritical: boolean;
  isPopulated: (input: Partial<ReportInput>, connectorData: NormalisedTaskData | null) => boolean;
  reason: string;
}

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function validMilestones(input: Partial<ReportInput>): boolean {
  const filled = (input.milestones ?? []).filter(
    (m) => hasText(m.milestoneName) && hasText(m.baselineDate) && hasText(m.forecastDate),
  );
  return filled.length >= 3;
}

function validHealthHistory(input: Partial<ReportInput>): boolean {
  const rows = (input.healthHistory ?? []).filter(
    (row) =>
      hasText(row.weekLabel) &&
      row.budgetBurnPercent >= 0 &&
      row.scopeCompletionPercent >= 0 &&
      row.scheduleHealthPercent >= 0,
  );
  return rows.length >= 2;
}

const MANDATORY_FIELDS: MandatoryField[] = [
  {
    field: "projectData.projectName",
    label: "Project name",
    isCritical: true,
    isPopulated: (input) => hasText(input.projectData?.projectName),
    reason: "Required for report header and executive summary",
  },
  {
    field: "projectData.clientName",
    label: "Client name",
    isCritical: true,
    isPopulated: (input) => hasText(input.projectData?.clientName),
    reason: "Required for report header",
  },
  {
    field: "projectData.reportingPeriodFrom",
    label: "Reporting period start",
    isCritical: true,
    isPopulated: (input) => hasText(input.projectData?.reportingPeriodFrom),
    reason: "Defines the week this report covers",
  },
  {
    field: "projectData.reportingPeriodTo",
    label: "Reporting period end",
    isCritical: true,
    isPopulated: (input) => hasText(input.projectData?.reportingPeriodTo),
    reason: "Defines the week this report covers",
  },
  {
    field: "projectData.deliveryPMName",
    label: "Delivery PM name",
    isCritical: true,
    isPopulated: (input) => hasText(input.projectData?.deliveryPMName),
    reason: "Required on the cover slide",
  },
  {
    field: "healthData.currentBudgetBurnPercent",
    label: "Budget burn % this week",
    isCritical: true,
    isPopulated: (input) => (input.healthData?.currentBudgetBurnPercent ?? -1) >= 0,
    reason: "Drives financial KPIs and RAG forecast",
  },
  {
    field: "milestones",
    label: "Milestone forecast dates",
    isCritical: true,
    isPopulated: (input) => validMilestones(input),
    reason: "At least three milestones with dates are required for schedule analysis",
  },
  {
    field: "freeTextDump",
    label: "Weekly context notes",
    isCritical: true,
    isPopulated: (input) => (input.freeTextDump?.trim().length ?? 0) >= 50,
    reason: "PM narrative is required for executive summary quality",
  },
  {
    field: "healthHistory",
    label: "Health trend history",
    isCritical: false,
    isPopulated: (input) => validHealthHistory(input),
    reason: "Two or more weeks of trend data improve forecast accuracy",
  },
  {
    field: "healthData.currentScopeCompletionPercent",
    label: "Scope completion %",
    isCritical: false,
    isPopulated: (input) => (input.healthData?.currentScopeCompletionPercent ?? -1) >= 0,
    reason: "Used in health indicators and trend charts",
  },
  {
    field: "healthData.currentScheduleHealthPercent",
    label: "Schedule health %",
    isCritical: false,
    isPopulated: (input) => (input.healthData?.currentScheduleHealthPercent ?? -1) >= 0,
    reason: "Used in schedule RAG calculation",
  },
  {
    field: "raid.risks",
    label: "RAID log — risks",
    isCritical: false,
    isPopulated: (input) => (input.raid?.risks?.length ?? 0) > 0,
    reason: "Enriches RAID matrix on slide 4",
  },
  {
    field: "commercialData.tnmHistory",
    label: "Commercial history",
    isCritical: false,
    isPopulated: (input) =>
      (input.commercialData?.tnmHistory ?? []).some((row) => row.actualCostThatWeek && row.actualCostThatWeek > 0) ||
      (input.commercialData?.fpHistory ?? []).some((row) => row.internalCost && row.internalCost > 0),
    reason: "Financial trend data improves commercial narrative",
  },
  {
    field: "workstreams",
    label: "Workstream progress",
    isCritical: false,
    isPopulated: (input, connectorData) =>
      Boolean(connectorData) ||
      (input.workstreams ?? []).some((ws) => ws.tasksPlanned > 0 || hasText(ws.workstreamName)),
    reason: "Workstream scorecard requires task progress data",
  },
];

export function checkGaps(
  input: Partial<ReportInput>,
  connectorData: NormalisedTaskData | null,
): { gaps: Gap[]; completeness: CompletenessReport; hasGaps: boolean } {
  const populatedFields: string[] = [];
  const missingFields: string[] = [];
  const lowConfidenceFields: string[] = [];
  const gaps: Gap[] = [];

  if (connectorData?.confidence === "LOW") {
    lowConfidenceFields.push("workstreams");
  } else if (connectorData?.confidence === "MEDIUM") {
    lowConfidenceFields.push("workstreams");
  }

  for (const rule of MANDATORY_FIELDS) {
    if (rule.isPopulated(input, connectorData)) {
      populatedFields.push(rule.field);
    } else {
      missingFields.push(rule.field);
      gaps.push({
        field: rule.field,
        label: rule.label,
        reason: rule.reason,
        isCritical: rule.isCritical,
      });
    }
  }

  const score = Math.round((populatedFields.length / MANDATORY_FIELDS.length) * 100);
  const criticalGaps = gaps.filter((gap) => gap.isCritical);
  const hasGaps = !(score > 85 && criticalGaps.length === 0);

  return {
    gaps,
    completeness: {
      score,
      populatedFields,
      missingFields,
      lowConfidenceFields,
    },
    hasGaps,
  };
}
