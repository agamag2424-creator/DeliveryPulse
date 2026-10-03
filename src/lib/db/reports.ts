import type { Report as PrismaReport } from "@prisma/client";

import { getOwnedProject } from "@/lib/db/projects";
import { embedReport } from "@/lib/jobs/embedReport";
import { prisma } from "@/lib/prisma";
import type { ReportOutput } from "@/lib/reportOutputSchema";
import type { ReportInput } from "@/types/report";

function buildWeekLabel(input: ReportInput): string {
  const from = input.projectData.reportingPeriodFrom;
  if (from) {
    const date = new Date(from);
    if (!Number.isNaN(date.getTime())) {
      const start = new Date(date.getFullYear(), 0, 1);
      const week = Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
      return `W${week}`;
    }
  }
  return `W${new Date().getMonth() + 1}`;
}

function parsePeriodDate(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

export async function saveReport(
  organizationId: string,
  userId: string,
  projectId: string,
  input: ReportInput,
  output: ReportOutput,
): Promise<PrismaReport> {
  const project = await getOwnedProject(organizationId, projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const record = await prisma.report.create({
    data: {
      projectId,
      userId,
      weekLabel: buildWeekLabel(input),
      periodFrom: parsePeriodDate(input.projectData.reportingPeriodFrom),
      periodTo: parsePeriodDate(input.projectData.reportingPeriodTo),
      inputSnapshot: input as object,
      outputSnapshot: output as object,
      ragStatus: output.rag_status,
      ragAiSuggested: output.rag_ai_suggested,
      ragOverridden: output.rag_status !== output.rag_ai_suggested,
    },
  });

  void embedReport(record.id).catch((error) => {
    console.error("Background embedReport failed:", error);
  });

  return record;
}

export async function getReports(organizationId: string, projectId: string): Promise<PrismaReport[]> {
  const project = await getOwnedProject(organizationId, projectId);
  if (!project) {
    return [];
  }
  return prisma.report.findMany({
    where: { projectId },
    orderBy: { generatedAt: "desc" },
  });
}

export async function getReport(organizationId: string, reportId: string): Promise<PrismaReport | null> {
  return prisma.report.findFirst({
    where: { id: reportId, project: { organizationId } },
  });
}
