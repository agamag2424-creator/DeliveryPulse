import { mapPrismaProject } from "@/types/project";
import { prisma } from "@/lib/prisma";

import { normaliseJiraToReportInput } from "../normalise";
import type { AgentState } from "../types";

export async function normaliseNode(state: AgentState): Promise<Partial<AgentState>> {
  try {
    const record = await prisma.project.findFirst({
      where: { id: state.projectId, isArchived: false },
    });
    if (!record) {
      return { error: "Project not found" };
    }

    const normalisedInput = normaliseJiraToReportInput(mapPrismaProject(record), state.connectorData);
    return { normalisedInput };
  } catch (error) {
    console.error("Agent normalise node failed:", error);
    return { error: "Failed to normalise connector data" };
  }
}
