import type { AgentState } from "../types";

export async function errorNode(state: AgentState): Promise<Partial<AgentState>> {
  return { error: state.error ?? "Unknown agent error" };
}

export async function surfaceGapsNode(_state: AgentState): Promise<Partial<AgentState>> {
  return {};
}
