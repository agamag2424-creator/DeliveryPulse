import { prisma } from "@/lib/prisma";
import type { UsageActor } from "@/lib/usage/constants";

export async function usageActorForProject(
  projectId: string,
  userId: string,
): Promise<UsageActor | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: { organizationId: true },
  });
  if (!project) {
    return null;
  }
  return { organizationId: project.organizationId, userId };
}
