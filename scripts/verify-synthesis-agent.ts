/**
 * Smoke tests for E-P2-07 synthesis agent (no live Claude/Jira required for core paths).
 * Run: npx tsx scripts/verify-synthesis-agent.ts
 */
import { cloudBridgeSampleReportInput } from "../src/data/cloudbridge-sample";
import { checkGaps } from "../src/lib/agent/gapCheck";
import { normaliseJiraToReportInput } from "../src/lib/agent/normalise";
import type { NormalisedTaskData } from "../src/lib/connectors/jira/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const mockJiraData: NormalisedTaskData = {
  sprintName: "Sprint 14",
  sprintStartDate: "2026-04-07",
  sprintEndDate: "2026-04-20",
  tasksPlanned: 8,
  tasksCompleted: 5,
  tasksInProgress: 2,
  blockers: [
    {
      issueKey: "CB-42",
      summary: "API gateway certificate pending",
      assignee: "Alex Chen",
      reason: "Waiting on client security team",
    },
  ],
  recentCompletions: ["CB-38: OAuth flow complete"],
  teamMembers: ["Alex Chen", "Priya Nair", "Sam Okonkwo", "Jordan Lee"],
  source: "JIRA",
  fetchedAt: new Date().toISOString(),
  confidence: "HIGH",
};

const mockProject = {
  id: "project-test",
  name: "CloudBridge — Enterprise MuleSoft Integration Platform",
  clientName: "NorthBridge Financial Services",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  phase: "Build",
  engagementModel: "TNM",
  currency: "USD",
  contractValue: 1_200_000,
  isArchived: false,
};

async function testGraphInitialises() {
  process.env.DATABASE_URL ??=
    "postgresql://postgres:postgres@localhost:51214/template1?sslmode=disable";
  const { synthesisAgentGraph } = await import("../src/lib/agent/synthesisAgent");
  assert(Boolean(synthesisAgentGraph), "synthesisAgentGraph must compile");
  assert(typeof synthesisAgentGraph.invoke === "function", "graph.invoke must exist");
  console.log("✓ LangGraph StateGraph initialises");
}

function testNormalisePopulatesWorkstreams() {
  const partial = normaliseJiraToReportInput(mockProject, mockJiraData);
  assert(partial.workstreams?.[0]?.tasksPlanned === 8, "Jira tasksPlanned mapped to workstream");
  assert(partial.workstreams?.[0]?.tasksCompleted === 5, "Jira tasksCompleted mapped to workstream");
  assert((partial.workstreams?.[0]?.actualTeamSize ?? 0) === 4, "teamMembers count mapped to actualTeamSize");
  assert(Boolean(partial.projectData?.projectName?.includes("CloudBridge")), "project name prefilled");
  console.log("✓ NORMALISE maps Jira data to ReportInput fields");
}

function testGapCheckWithJira() {
  const partial = normaliseJiraToReportInput(mockProject, mockJiraData);
  const { gaps, completeness, hasGaps } = checkGaps(partial, mockJiraData);
  const criticalFields = gaps.filter((gap) => gap.isCritical).map((gap) => gap.field);

  assert(hasGaps, "Jira-only partial input should still have gaps");
  assert(criticalFields.includes("healthData.currentBudgetBurnPercent"), "budget burn should be a critical gap");
  assert(criticalFields.includes("milestones"), "milestones should be a critical gap");
  assert(criticalFields.includes("freeTextDump"), "free text should be a critical gap");
  assert(criticalFields.length >= 2 && criticalFields.length <= 6, "expected 2–6 critical gaps from Jira path");
  assert(completeness.score >= 30 && completeness.score <= 70, "completeness should be partial (30–70%)");
  console.log(`✓ GAP CHECK with Jira: ${criticalFields.length} critical gaps, score=${completeness.score}%`);
}

function testGapCheckManualOnly() {
  const { gaps, hasGaps } = checkGaps({}, null);
  assert(hasGaps, "empty manual input should have gaps");
  assert(gaps.length >= 8, "manual-only flow should surface most mandatory fields as gaps");
  console.log(`✓ GAP CHECK manual-only: ${gaps.length} gaps`);
}

function testCloudBridgeSampleStillHasGapsWhenStripped() {
  const stripped = {
    ...cloudBridgeSampleReportInput,
    healthData: {
      ...cloudBridgeSampleReportInput.healthData,
      currentBudgetBurnPercent: -1,
    },
    freeTextDump: "",
    milestones: cloudBridgeSampleReportInput.milestones.map((m) => ({
      ...m,
      milestoneName: "",
      baselineDate: "",
      forecastDate: "",
    })),
  };
  const { gaps, hasGaps } = checkGaps(stripped, mockJiraData);
  assert(hasGaps, "stripped CloudBridge + Jira context should still require gap fill");
  assert(gaps.some((gap) => gap.isCritical), "must include critical gaps");
  console.log("✓ CloudBridge + Jira produces critical gaps when key fields missing");
}

async function main() {
  await testGraphInitialises();
  testNormalisePopulatesWorkstreams();
  testGapCheckWithJira();
  testGapCheckManualOnly();
  testCloudBridgeSampleStillHasGapsWhenStripped();
  console.log("\nLive FETCH/GENERATE requires database + JIRA + ANTHROPIC_API_KEY — use /api/agent/run manually.");
}

main().catch((error) => {
  console.error("✗ verify-synthesis-agent failed:", error);
  process.exit(1);
});
