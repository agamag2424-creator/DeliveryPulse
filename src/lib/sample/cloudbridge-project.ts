import { cloudBridgeSampleReportInput } from "@/data/cloudbridge-sample";
import type { CreateProjectInput } from "@/types/project";

export const CLOUDBRIDGE_SAMPLE_PROJECT_NAME =
  cloudBridgeSampleReportInput.projectData.projectName;

export const cloudBridgeSampleProjectInput: CreateProjectInput = {
  name: cloudBridgeSampleReportInput.projectData.projectName,
  clientName: cloudBridgeSampleReportInput.projectData.clientName,
  startDate: cloudBridgeSampleReportInput.commercialData.engagementStart,
  endDate: cloudBridgeSampleReportInput.commercialData.engagementEnd,
  phase: cloudBridgeSampleReportInput.projectData.currentProjectPhase,
  engagementModel: cloudBridgeSampleReportInput.commercialData.engagementModel,
  currency: cloudBridgeSampleReportInput.commercialData.currency,
  contractValue: cloudBridgeSampleReportInput.commercialData.originalContractValue,
};

export function isCloudBridgeProject(name: string): boolean {
  return name === CLOUDBRIDGE_SAMPLE_PROJECT_NAME;
}

/** @deprecated Use isCloudBridgeProject */
export const isCloudBridgeSampleProject = isCloudBridgeProject;
