import { checkGaps } from "../gapCheck";
import type { AgentState } from "../types";

export async function gapCheckNode(state: AgentState): Promise<Partial<AgentState>> {
  const { gaps, completeness, hasGaps } = checkGaps(state.normalisedInput, state.connectorData);
  return { gaps, completeness, hasGaps };
}
