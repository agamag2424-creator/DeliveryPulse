import type { Project as PrismaProject } from "@prisma/client";

import type { Project } from "@/context/ProjectContext";

export interface CreateProjectInput {
  name: string;
  clientName: string;
  startDate: string;
  endDate: string;
  phase: string;
  engagementModel: string;
  currency?: string;
  contractValue?: number;
}

export function mapPrismaProject(record: PrismaProject): Project {
  return {
    id: record.id,
    name: record.name,
    clientName: record.clientName,
    startDate: record.startDate.toISOString(),
    endDate: record.endDate.toISOString(),
    phase: record.phase,
    engagementModel: record.engagementModel,
    currency: record.currency,
    contractValue: record.contractValue,
    isArchived: record.isArchived,
  };
}

export type ProjectLatestReport = {
  ragStatus: string;
  weekLabel: string;
  periodTo: string;
};

export type ProjectWithLatestReport = Project & {
  latestReport: ProjectLatestReport | null;
};

export function parseProjectDate(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return parsed;
}
