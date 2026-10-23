import { generateReport } from "@/lib/claude/generateReport";
import { usageActorForProject } from "@/lib/usage/actor";
import { mergePartialToReportInput } from "../gapExtract";
import type { AgentState } from "../types";

export async function generateNode(state: AgentState): Promise<Partial<AgentState>> {
  try {
    const input = state.finalInput ?? mergePartialToReportInput(state.normalisedInput);
    const actor = await usageActorForProject(state.projectId, state.userId);
    const reportOutput = await generateReport(input, actor ?? undefined);
    return { finalInput: input, reportOutput };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report generation failed";
    return { error: message };
  }
}
