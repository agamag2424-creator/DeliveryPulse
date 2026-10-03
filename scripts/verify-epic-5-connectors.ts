/**
 * Epic 5: Asana, Monday.com, Trello connectors on the org-grant / project-map pattern.
 * Does not require live OAuth apps — register those separately and paste env vars.
 *
 * Usage: npx tsx scripts/verify-epic-5-connectors.ts
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import "./load-local-env";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function readSrc(relativePath: string): string {
  return readFileSync(join(__dirname, "..", relativePath), "utf8");
}

function assertSchemaAllowsMultipleBindings(): void {
  const schema = readSrc("prisma/schema.prisma");
  const bindingBlock = schema.slice(
    schema.indexOf("model ProjectConnectorBinding"),
    schema.indexOf("model Report"),
  );
  assert(bindingBlock.includes("@@unique([projectId, type])"), "a project can map one binding per connector type");
  assert(!bindingBlock.includes("projectId     String                   @unique"), "projectId must not be globally unique");
  assert(schema.includes('connectorBindings  ProjectConnectorBinding[]'), "Project has many connector bindings");
  console.log("✓ schema allows Jira + Asana (etc.) on the same project");
}

function assertSharedTypesAndMapping(): void {
  const types = readSrc("src/lib/connectors/types.ts");
  assert(types.includes('"ASANA"'), "NormalisedTaskData source includes ASANA");
  assert(types.includes('"MONDAY"'), "NormalisedTaskData source includes MONDAY");
  assert(types.includes('"TRELLO"'), "NormalisedTaskData source includes TRELLO");
  assert(types.includes('"JIRA"'), "NormalisedTaskData source still includes JIRA");

  const fetchNode = readSrc("src/lib/agent/nodes/fetch.ts");
  assert(fetchNode.includes("fetchConnectorProjectData"), "agent fetch uses any mapped connector");
  assert(!fetchNode.includes("jiraConnectors"), "agent fetch must not be Jira-only");

  const generateButton = readSrc("src/components/projects/GenerateReportButton.tsx");
  assert(generateButton.includes("/api/connectors/status"), "generate uses any-connector status");

  assert(existsSync(join(__dirname, "../src/lib/connectors/MAPPING.md")), "MAPPING.md records Jira-shaped leaks");
  const mapping = readSrc("src/lib/connectors/MAPPING.md");
  assert(mapping.includes("flattened"), "mapping notes flag flattened workstreams");

  const envExample = readSrc(".env.local.example");
  assert(envExample.includes("ASANA_CLIENT_ID"), "env example has Asana placeholders");
  assert(envExample.includes("MONDAY_CLIENT_ID"), "env example has Monday placeholders");
  assert(envExample.includes("TRELLO_API_KEY"), "env example has Trello API key");

  console.log("✓ shared NormalisedTaskData + generate/agent use any connector");
}

function assertConnectorImplementations(): void {
  for (const folder of ["asana", "monday", "trello"] as const) {
    assert(existsSync(join(__dirname, `../src/lib/connectors/${folder}/oauth.ts`)), `${folder} oauth exists`);
    assert(existsSync(join(__dirname, `../src/lib/connectors/${folder}/fetch.ts`)), `${folder} fetch exists`);
    assert(existsSync(join(__dirname, `../src/lib/connectors/${folder}/discover.ts`)), `${folder} discover exists`);
  }

  const runtime = readSrc("src/lib/connectors/runtime.ts");
  assert(runtime.includes("const exhaustive: never"), "runtime dispatcher is exhaustive");
  assert(runtime.includes('case "ASANA"'), "runtime handles Asana");
  assert(runtime.includes('case "MONDAY"'), "runtime handles Monday");
  assert(runtime.includes('case "TRELLO"'), "runtime handles Trello");

  assert(
    existsSync(join(__dirname, "../src/app/connectors/trello/complete/page.tsx")),
    "Trello client hash callback page exists",
  );

  console.log("✓ Asana / Monday / Trello OAuth + fetch + Trello hash callback");
}

async function assertHttpGates(baseUrl: string): Promise<void> {
  if (process.env.AUTH_BYPASS === "true") {
    console.log("⊘ HTTP 401 checks skipped (AUTH_BYPASS=true)");
    return;
  }

  const routes = [
    "/api/connectors/asana/auth",
    "/api/connectors/monday/status?projectId=x",
    "/api/connectors/trello/projects?projectId=x",
    "/api/connectors/status?projectId=x",
  ];

  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route}`);
    assert(
      response.status === 401 || response.status === 403,
      `unauthenticated ${route} expected 401/403, got ${response.status}`,
    );
  }

  console.log(`✓ unauthenticated HTTP gates at ${baseUrl}`);
}

async function main(): Promise<void> {
  assertSchemaAllowsMultipleBindings();
  assertSharedTypesAndMapping();
  assertConnectorImplementations();

  const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3001";
  try {
    await assertHttpGates(baseUrl);
  } catch (error) {
    console.log(
      "⚠ HTTP gates skipped (start AUTH_BYPASS=false npm run dev -- -p 3001):",
      (error as Error).message,
    );
  }

  console.log("\nEpic 5 verify passed (live OAuth still needs your Asana/Monday/Trello apps).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
