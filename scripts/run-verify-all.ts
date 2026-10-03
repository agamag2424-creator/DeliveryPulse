/**
 * Runs all Phase 2 verify/smoke scripts in sequence.
 * Usage: npm run test:verify
 * Optional: TEST_BASE_URL=http://localhost:3001 (default)
 */
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

const scriptsDir = join(__dirname);

interface VerifyScript {
  id: string;
  epic: string;
  file: string;
  requiresServer?: boolean;
  requiresEnv?: string[];
}

const VERIFY_SCRIPTS: VerifyScript[] = [
  {
    id: "generate-auth",
    epic: "EPIC-0",
    file: "verify-epic-0-generate-auth.ts",
  },
  {
    id: "org-roles",
    epic: "EPIC-1",
    file: "verify-epic-1-org.ts",
  },
  {
    id: "billing-razorpay",
    epic: "EPIC-2",
    file: "verify-epic-2-billing.ts",
  },
  {
    id: "quota-usage",
    epic: "EPIC-3",
    file: "verify-epic-3-quota.ts",
  },
  {
    id: "ai-providers",
    epic: "EPIC-4",
    file: "verify-epic-4-ai-providers.ts",
  },
  {
    id: "connectors-asana-monday-trello",
    epic: "EPIC-5",
    file: "verify-epic-5-connectors.ts",
  },
  {
    id: "onboarding-first-run",
    epic: "EPIC-6",
    file: "verify-epic-6-onboarding.ts",
  },
  {
    id: "embeddings",
    epic: "E-P2-03",
    file: "verify-embeddings.ts",
  },
  {
    id: "jira-connector",
    epic: "E-P2-06",
    file: "verify-jira-connector.ts",
    requiresServer: true,
    requiresEnv: ["ENCRYPTION_KEY"],
  },
  // Add new verify scripts here as epics ship — keep in epic order.
  // { id: "auth", epic: "E-P2-01", file: "verify-auth.ts" },
  // { id: "reports", epic: "E-P2-05", file: "verify-reports.ts", requiresServer: true },
  { id: "synthesis-agent", epic: "E-P2-07", file: "verify-synthesis-agent.ts" },
  { id: "gap-fill", epic: "E-P2-08", file: "verify-gap-fill.ts" },
  { id: "embedding-jobs", epic: "E-P2-09", file: "verify-embedding-jobs.ts", requiresEnv: ["OPENAI_API_KEY"] },
  { id: "onboarding", epic: "E-P2-10", file: "verify-onboarding.ts" },
  { id: "settings", epic: "E-P2-11", file: "verify-settings.ts", requiresServer: true },
];

function envReady(required: string[] | undefined): boolean {
  if (!required?.length) {
    return true;
  }
  return required.every((key) => Boolean(process.env[key]?.trim()));
}

function runScript(script: VerifyScript): "pass" | "skip" | "fail" {
  const path = join(scriptsDir, script.file);
  if (!existsSync(path)) {
    console.log(`⊘ ${script.epic} ${script.id}: script not found (${script.file}) — add when epic ships`);
    return "skip";
  }

  if (!envReady(script.requiresEnv)) {
    const missing = (script.requiresEnv ?? []).filter((key) => !process.env[key]?.trim());
    console.log(`⊘ ${script.epic} ${script.id}: skipped (missing env: ${missing.join(", ")})`);
    return "skip";
  }

  console.log(`\n▶ ${script.epic} ${script.id} (${script.file})`);
  const result = spawnSync("npx", ["tsx", path], {
    stdio: "inherit",
    env: process.env,
    cwd: join(scriptsDir, ".."),
  });

  return result.status === 0 ? "pass" : "fail";
}

async function main() {
  console.log("DeliveryPulse — verify test suite");
  console.log(`TEST_BASE_URL=${process.env.TEST_BASE_URL ?? "http://localhost:3001"}`);

  const results = { pass: 0, skip: 0, fail: 0 };

  for (const script of VERIFY_SCRIPTS) {
    const outcome = runScript(script);
    results[outcome] += 1;
  }

  console.log("\n--- Summary ---");
  console.log(`Passed: ${results.pass}  Skipped: ${results.skip}  Failed: ${results.fail}`);

  if (results.fail > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
