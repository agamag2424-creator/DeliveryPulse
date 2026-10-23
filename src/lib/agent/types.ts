import type { Connector } from "@/lib/db/connectors";

import type { NormalisedTaskData } from "@/lib/connectors/types";
import type { ReportOutput } from "@/lib/reportOutputSchema";
import type { ReportInput } from "@/types/report";

export interface Gap {
  field: string;
  label: string;
  reason: string;
  isCritical: boolean;
}

export interface CompletenessReport {
  score: number;
  populatedFields: string[];
  missingFields: string[];
  lowConfidenceFields: string[];
}

export interface AgentState {
  projectId: string;
  userId: string;
  connectors: Connector[];
  connectorData: NormalisedTaskData | null;
  normalisedInput: Partial<ReportInput>;
  completeness: CompletenessReport;
  gaps: Gap[];
  hasGaps: boolean;
  pmAnswers: Record<string, string>;
  finalInput: ReportInput | null;
  reportOutput: ReportOutput | null;
  error: string | null;
}

export type AgentRunResult =
  | {
      status: "GAPS";
      gaps: Gap[];
      partialInput: Partial<ReportInput>;
      completeness: CompletenessReport;
      agentState: AgentResumeState;
    }
  | {
      status: "COMPLETE";
      reportOutput: ReportOutput;
      reportId: string;
      finalInput: ReportInput;
    }
  | {
      status: "ERROR";
      error: string;
    };

/** Serializable state returned to client for gap-fill resume (Node 4+). */
export interface AgentResumeState {
  projectId: string;
  userId: string;
  connectorData: NormalisedTaskData | null;
  normalisedInput: Partial<ReportInput>;
  gaps: Gap[];
  completeness: CompletenessReport;
}
