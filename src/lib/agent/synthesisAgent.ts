import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { Connector } from "@/lib/db/connectors";

import type { NormalisedTaskData } from "@/lib/connectors/types";
import type { ReportOutput } from "@/lib/reportOutputSchema";
import { saveReport } from "@/lib/db/reports";
import { prisma } from "@/lib/prisma";
import type { ReportInput } from "@/types/report";

import { errorNode, surfaceGapsNode } from "./nodes/error";
import { fetchNode } from "./nodes/fetch";
import { gapCheckNode } from "./nodes/gapCheck";
import { gapFillNode } from "./nodes/gapFill";
import { generateNode } from "./nodes/generate";
import { normaliseNode } from "./nodes/normalise";
import type { AgentResumeState, AgentRunResult, AgentState, CompletenessReport, Gap } from "./types";

const AgentStateAnnotation = Annotation.Root({
  projectId: Annotation<string>,
  userId: Annotation<string>,
  connectors: Annotation<Connector[]>({
    reducer: (_left, right) => right ?? [],
    default: () => [],
  }),
  connectorData: Annotation<NormalisedTaskData | null>({
    reducer: (_left, right) => right ?? null,
    default: () => null,
  }),
  normalisedInput: Annotation<Partial<ReportInput>>({
    reducer: (left, right) => ({ ...left, ...(right ?? {}) }),
    default: () => ({}),
  }),
  completeness: Annotation<CompletenessReport>({
    reducer: (_left, right) => right ?? { score: 0, populatedFields: [], missingFields: [], lowConfidenceFields: [] },
    default: () => ({ score: 0, populatedFields: [], missingFields: [], lowConfidenceFields: [] }),
  }),
  gaps: Annotation<Gap[]>({
    reducer: (_left, right) => right ?? [],
    default: () => [],
  }),
  hasGaps: Annotation<boolean>({
    reducer: (_left, right) => right ?? false,
    default: () => false,
  }),
  pmAnswers: Annotation<Record<string, string>>({
    reducer: (left, right) => ({ ...left, ...(right ?? {}) }),
    default: () => ({}),
  }),
  finalInput: Annotation<ReportInput | null>({
    reducer: (_left, right) => right ?? null,
    default: () => null,
  }),
  reportOutput: Annotation<ReportOutput | null>({
    reducer: (_left, right) => right ?? null,
    default: () => null,
  }),
  error: Annotation<string | null>({
    reducer: (_left, right) => right ?? null,
    default: () => null,
  }),
});

function routeAfterNormalise(state: AgentState): "gapCheck" | "handleError" {
  return state.error ? "handleError" : "gapCheck";
}

function routeAfterGapCheck(state: AgentState): "surfaceGaps" | "gapFill" | "generate" | "handleError" {
  if (state.error) {
    return "handleError";
  }
  if (state.hasGaps) {
    const hasAnswers = Object.values(state.pmAnswers ?? {}).some((answer) => answer.trim().length > 0);
    return hasAnswers ? "gapFill" : "surfaceGaps";
  }
  return "generate";
}

function buildGraph() {
  const graph = new StateGraph(AgentStateAnnotation)
    .addNode("fetch", fetchNode)
    .addNode("normalise", normaliseNode)
    .addNode("gapCheck", gapCheckNode)
    .addNode("surfaceGaps", surfaceGapsNode)
    .addNode("gapFill", gapFillNode)
    .addNode("generate", generateNode)
    .addNode("handleError", errorNode)
    .addEdge(START, "fetch")
    .addEdge("fetch", "normalise")
    .addConditionalEdges("normalise", routeAfterNormalise, {
      gapCheck: "gapCheck",
      handleError: "handleError",
    })
    .addConditionalEdges("gapCheck", routeAfterGapCheck, {
      surfaceGaps: "surfaceGaps",
      gapFill: "gapFill",
      generate: "generate",
      handleError: "handleError",
    })
    .addEdge("surfaceGaps", END)
    .addEdge("gapFill", "generate")
    .addEdge("generate", END)
    .addEdge("handleError", END);

  return graph.compile();
}

const compiledGraph = buildGraph();

function toResumeState(state: AgentState): AgentResumeState {
  return {
    projectId: state.projectId,
    userId: state.userId,
    connectorData: state.connectorData,
    normalisedInput: state.normalisedInput,
    gaps: state.gaps,
    completeness: state.completeness,
  };
}

export async function runSynthesisAgent(
  projectId: string,
  userId: string,
  pmAnswers: Record<string, string> = {},
): Promise<AgentRunResult> {
  const initialState: AgentState = {
    projectId,
    userId,
    connectors: [],
    connectorData: null,
    normalisedInput: {},
    completeness: { score: 0, populatedFields: [], missingFields: [], lowConfidenceFields: [] },
    gaps: [],
    hasGaps: false,
    pmAnswers,
    finalInput: null,
    reportOutput: null,
    error: null,
  };

  const result = (await compiledGraph.invoke(initialState)) as AgentState;

  if (result.error) {
    return { status: "ERROR", error: result.error };
  }

  if (result.hasGaps && !Object.values(pmAnswers).some((answer) => answer.trim())) {
    return {
      status: "GAPS",
      gaps: result.gaps,
      partialInput: result.normalisedInput,
      completeness: result.completeness,
      agentState: toResumeState(result),
    };
  }

  if (!result.reportOutput || !result.finalInput) {
    return { status: "ERROR", error: "Report generation did not produce output" };
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, isArchived: false },
    select: { organizationId: true },
  });
  if (!project) {
    return { status: "ERROR", error: "Project not found" };
  }

  const saved = await saveReport(project.organizationId, userId, projectId, result.finalInput, result.reportOutput);

  return {
    status: "COMPLETE",
    reportOutput: result.reportOutput,
    reportId: saved.id,
    finalInput: result.finalInput,
  };
}

export async function resumeSynthesisAgent(
  agentState: AgentResumeState,
  pmAnswers: Record<string, string>,
): Promise<AgentRunResult> {
  return runSynthesisAgent(agentState.projectId, agentState.userId, pmAnswers);
}

export { compiledGraph as synthesisAgentGraph };
