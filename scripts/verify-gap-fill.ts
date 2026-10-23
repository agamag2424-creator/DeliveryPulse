import { checkGaps } from "../src/lib/agent/gapCheck";
import { normaliseJiraToReportInput } from "../src/lib/agent/normalise";
import type { NormalisedTaskData } from "../src/lib/connectors/jira/types";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const mockJira: NormalisedTaskData = {
  sprintName: "Sprint 1",
  sprintStartDate: "2026-05-01",
  sprintEndDate: "2026-05-14",
  tasksPlanned: 6,
  tasksCompleted: 4,
  tasksInProgress: 1,
  blockers: [],
  recentCompletions: ["CB-1: Done"],
  teamMembers: ["Alex"],
  source: "JIRA",
  fetchedAt: new Date().toISOString(),
  confidence: "HIGH",
};

const project = {
  id: "p1",
  name: "Test",
  clientName: "Acme",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  phase: "Build",
  engagementModel: "TNM",
  currency: "USD",
  contractValue: 100000,
  isArchived: false,
};

function main() {
  const partial = normaliseJiraToReportInput(project, mockJira);
  const { gaps, hasGaps } = checkGaps(partial, mockJira);
  const critical = gaps.filter((gap) => gap.isCritical);

  assert(hasGaps, "gap fill flow should detect gaps");
  assert(critical.length >= 2, "at least budget + milestones + free text gaps expected");
  assert(Boolean(partial.workstreams?.[0]?.tasksPlanned), "Jira context visible in partial input");

  console.log("✓ gap-fill prerequisites: critical gaps detected with Jira context");
  console.log(`  critical gaps: ${critical.map((g) => g.field).join(", ")}`);
  console.log("\nManual (E-P2-13): gap-fill page UI, submit → /api/agent/gaps → report viewer");
}

main();
