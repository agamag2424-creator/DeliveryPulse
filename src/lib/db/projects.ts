import type { Project as PrismaProject } from "@prisma/client";

import {
  mapPrismaProject,
  parseProjectDate,
  type CreateProjectInput,
  type ProjectWithLatestReport,
} from "@/types/project";
import { prisma } from "@/lib/prisma";

export type { CreateProjectInput };

export async function createProject(
  organizationId: string,
  createdByUserId: string,
  data: CreateProjectInput,
): Promise<ReturnType<typeof mapPrismaProject>> {
  const record = await prisma.project.create({
    data: {
      organizationId,
      createdByUserId,
      name: data.name.trim(),
      clientName: data.clientName.trim(),
      startDate: parseProjectDate(data.startDate),
      endDate: parseProjectDate(data.endDate),
      phase: data.phase,
      engagementModel: data.engagementModel,
      currency: data.currency ?? "USD",
      contractValue: data.contractValue ?? 0,
    },
  });
  return mapPrismaProject(record);
}

export async function getProjects(organizationId: string): Promise<ReturnType<typeof mapPrismaProject>[]> {
  const records = await prisma.project.findMany({
    where: { organizationId, isArchived: false },
    orderBy: { updatedAt: "desc" },
  });
  return records.map(mapPrismaProject);
}

export async function getProjectsWithLatestReport(
  organizationId: string,
): Promise<ProjectWithLatestReport[]> {
  const records = await prisma.project.findMany({
    where: { organizationId, isArchived: false },
    orderBy: { updatedAt: "desc" },
    include: {
      reports: {
        orderBy: { generatedAt: "desc" },
        take: 1,
        select: { ragStatus: true, weekLabel: true, periodTo: true },
      },
    },
  });

  return records.map((record) => {
    const latest = record.reports[0];
    const project = mapPrismaProject(record);
    return {
      ...project,
      latestReport: latest
        ? {
            ragStatus: latest.ragStatus,
            weekLabel: latest.weekLabel,
            periodTo: latest.periodTo.toISOString(),
          }
        : null,
    };
  });
}

export async function getProject(
  organizationId: string,
  projectId: string,
): Promise<ReturnType<typeof mapPrismaProject> | null> {
  const record = await prisma.project.findFirst({
    where: { id: projectId, organizationId, isArchived: false },
  });
  return record ? mapPrismaProject(record) : null;
}

export async function updateProject(
  organizationId: string,
  projectId: string,
  data: Partial<CreateProjectInput & { name: string; clientName: string }>,
): Promise<ReturnType<typeof mapPrismaProject>> {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, organizationId, isArchived: false },
  });
  if (!existing) {
    throw new Error("Project not found");
  }

  const record = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.clientName !== undefined ? { clientName: data.clientName.trim() } : {}),
      ...(data.startDate !== undefined ? { startDate: parseProjectDate(data.startDate) } : {}),
      ...(data.endDate !== undefined ? { endDate: parseProjectDate(data.endDate) } : {}),
      ...(data.phase !== undefined ? { phase: data.phase } : {}),
      ...(data.engagementModel !== undefined ? { engagementModel: data.engagementModel } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
      ...(data.contractValue !== undefined ? { contractValue: data.contractValue } : {}),
    },
  });
  return mapPrismaProject(record);
}

export async function archiveProject(organizationId: string, projectId: string): Promise<void> {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, organizationId, isArchived: false },
  });
  if (!existing) {
    throw new Error("Project not found");
  }
  await prisma.project.update({
    where: { id: projectId },
    data: { isArchived: true },
  });
}

export async function getOwnedProject(
  organizationId: string,
  projectId: string,
): Promise<PrismaProject | null> {
  return prisma.project.findFirst({
    where: { id: projectId, organizationId, isArchived: false },
  });
}
