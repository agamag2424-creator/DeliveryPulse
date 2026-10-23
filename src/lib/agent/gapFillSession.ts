import type { AgentResumeState } from "@/lib/agent/types";
import type { Gap } from "@/lib/agent/types";
import type { CompletenessReport } from "@/lib/agent/types";
import type { ReportInput } from "@/types/report";

export interface GapFillSession {
  agentState: AgentResumeState;
  gaps: Gap[];
  partialInput: Partial<ReportInput>;
  completeness: CompletenessReport;
  jiraConnected: boolean;
}

const storageKey = (projectId: string) => `dp-gap-fill-${projectId}`;

export function saveGapFillSession(projectId: string, session: GapFillSession): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(storageKey(projectId), JSON.stringify(session));
}

export function loadGapFillSession(projectId: string): GapFillSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = sessionStorage.getItem(storageKey(projectId));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as GapFillSession;
  } catch {
    return null;
  }
}

export function clearGapFillSession(projectId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(storageKey(projectId));
}
