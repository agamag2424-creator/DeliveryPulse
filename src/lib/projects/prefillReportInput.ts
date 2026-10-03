import type { Project } from "@/context/ProjectContext";
import type { EngagementModel, ReportInput } from "@/types/report";

export function prefillReportInputFromProject(project: Project, base: ReportInput): ReportInput {
  return {
    ...base,
    projectData: {
      ...base.projectData,
      projectName: project.name,
      clientName: project.clientName,
      currentProjectPhase: project.phase as ReportInput["projectData"]["currentProjectPhase"],
    },
    commercialData: {
      ...base.commercialData,
      engagementModel: project.engagementModel as EngagementModel,
      originalContractValue: project.contractValue,
      currency: project.currency as ReportInput["commercialData"]["currency"],
      engagementStart: project.startDate.slice(0, 10),
      engagementEnd: project.endDate.slice(0, 10),
    },
  };
}
