import { usageActorForProject } from "@/lib/usage/actor";
import { applyGapAnswers } from "../gapExtract";
import type { AgentState } from "../types";

export async function gapFillNode(state: AgentState): Promise<Partial<AgentState>> {
  try {
    const actor = await usageActorForProject(state.projectId, state.userId);
    const finalInput = await applyGapAnswers(
      state.normalisedInput,
      state.gaps,
      state.pmAnswers,
      actor ?? undefined,
    );
    return { finalInput };
  } catch (error) {
    console.error("Agent gap fill node failed:", error);
    return { error: "Failed to apply gap-fill answers" };
  }
}
