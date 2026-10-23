import type { Project } from "@/context/ProjectContext";
import type { NormalisedTaskData } from "@/lib/connectors/types";
import { prefillReportInputFromProject } from "@/lib/projects/prefillReportInput";
import type { ReportInput } from "@/types/report";

import { createEmptyReportInput, getCurrentReportingWeek } from "./emptyReportInput";

function formatBlockers(data: NormalisedTaskData): string {
  if (data.blockers.length === 0) {
    return "";
  }
  return data.blockers.map((b) => `${b.issueKey}: ${b.summary} (${b.assignee})`).join("; ");
}

export function normaliseJiraToReportInput(
  project: Project,
  jiraData: NormalisedTaskData | null,
  base?: Partial<ReportInput>,
): Partial<ReportInput> {
  const week = getCurrentReportingWeek();
  const empty = createEmptyReportInput();
  const merged: ReportInput = {
    ...empty,
    ...(base as ReportInput),
    projectData: {
      ...empty.projectData,
      ...(base?.projectData ?? {}),
      reportingPeriodFrom: base?.projectData?.reportingPeriodFrom || week.from,
      reportingPeriodTo: base?.projectData?.reportingPeriodTo || week.to,
    },
  };

  const prefilled = prefillReportInputFromProject(project, merged);

  if (!jiraData) {
    return prefilled;
  }

  const blockerText = formatBlockers(jiraData);
  const sprintWorkstream = {
    workstreamName: jiraData.sprintName || "Sprint Delivery",
    plannedTeamSize: jiraData.teamMembers.length || jiraData.tasksPlanned,
    actualTeamSize: jiraData.teamMembers.length,
    tasksPlanned: jiraData.tasksPlanned,
    tasksCompleted: jiraData.tasksCompleted,
    activeBlockers: blockerText,
    dependencyStatus: jiraData.blockers.length > 0 ? ("At Risk" as const) : ("Clear" as const),
    blockers: jiraData.blockers.map((b) => ({
      description: b.summary,
      type: "Internal" as const,
      owner: b.assignee,
      impact: b.reason,
    })),
  };

  const workstreams =
    prefilled.workstreams.length > 0
      ? prefilled.workstreams.map((ws, index) => (index === 0 ? { ...ws, ...sprintWorkstream } : ws))
      : [sprintWorkstream];

  return {
    ...prefilled,
    projectData: {
      ...prefilled.projectData,
      currentProjectPhase:
        prefilled.projectData.currentProjectPhase || project.phase || prefilled.projectData.currentProjectPhase,
    },
    healthData: {
      ...prefilled.healthData,
      teamSize: jiraData.teamMembers.length || prefilled.healthData.teamSize,
      activeWorkstreams: Math.max(prefilled.workstreams.length, 1),
    },
    workstreams,
  };
}
