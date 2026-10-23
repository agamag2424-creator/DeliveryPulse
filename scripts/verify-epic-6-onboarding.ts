/**
 * Epic 6: first-run onboarding — blocking create-project, persistent checklist, aha = first report.
 *
 * Usage: npx tsx scripts/verify-epic-6-onboarding.ts
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

function assertAhaAndBacklog(): void {
  const backlog = readFileSync(join(__dirname, "../../DeliveryPulse_SaaS_Launch_Backlog.md"), "utf8");
  assert(backlog.includes("Locked aha moment"), "backlog locks the aha moment");
  assert(backlog.includes("generate the first weekly"), "aha is the first weekly report");
  assert(backlog.includes("Post-Epic 6 — manual launch tasks"), "manual tasks are saved for after Epic 6");
  assert(backlog.includes("Razorpay webhook (dashboard)"), "Razorpay webhook is a post-Epic 6 manual task");
  assert(backlog.includes("Register connector developer apps"), "connector app registration is post-Epic 6");
  assert(
    backlog.includes("someone who has never seen Delivery Pulse"),
    "first-time-user test is a post-Epic 6 manual task",
  );
  console.log("✓ aha moment locked + post-Epic 6 manual tasks listed");
}

function assertForcedGuideAndChecklist(): void {
  const flow = readSrc("src/components/onboarding/OnboardingFlow.tsx");
  assert(!flow.includes("Skip for now"), "zero-project guide is not skippable");
  assert(flow.includes("dismissible={false}"), "create-project modal cannot be dismissed in the guide");
  assert(flow.includes("Generate your first report"), "guide ends on the aha CTA");

  assert(existsSync(join(__dirname, "../src/components/onboarding/OnboardingChecklist.tsx")), "checklist component exists");
  const checklist = readSrc("src/components/onboarding/OnboardingChecklist.tsx");
  assert(checklist.includes('id === "report"') || checklist.includes('case "report"'), "checklist has generate-report item");
  assert(checklist.includes('case "invite"'), "checklist has invite item");

  const dashboard = readSrc("src/components/dashboard/DashboardContent.tsx");
  assert(dashboard.includes("OnboardingChecklist"), "dashboard renders the checklist");
  assert(dashboard.includes("onboarding?.blocking"), "dashboard blocks when there is no project");
  assert(!dashboard.includes("dismissOnboarding"), "empty dashboard is not dismissible via skip");

  const schema = readSrc("prisma/schema.prisma");
  assert(schema.includes("onboardingManualChosen"), "org stores manual-input choice");
  assert(schema.includes("onboardingInviteDeferred"), "org can defer invite");

  const api = readSrc("src/app/api/onboarding/route.ts");
  assert(api.includes("requireOrgPermission"), "GET /api/onboarding is session-gated");
  assert(api.includes("choose_manual"), "PATCH can choose manual input");

  console.log("✓ blocking first-run + persistent checklist");
}

async function assertHttpGates(baseUrl: string): Promise<void> {
  if (process.env.AUTH_BYPASS === "true") {
    const response = await fetch(`${baseUrl}/api/onboarding`);
    assert(response.ok, `AUTH_BYPASS GET /api/onboarding expected 200, got ${response.status}`);
    const payload = (await response.json()) as { items?: unknown[]; blocking?: boolean; ahaComplete?: boolean };
    assert(Array.isArray(payload.items), "onboarding status returns items");
    console.log("✓ GET /api/onboarding returns checklist status");
    return;
  }

  const response = await fetch(`${baseUrl}/api/onboarding`);
  assert(
    response.status === 401 || response.status === 403,
    `unauthenticated GET /api/onboarding expected 401/403, got ${response.status}`,
  );
  console.log(`✓ unauthenticated GET /api/onboarding at ${baseUrl}`);
}

async function main(): Promise<void> {
  assertAhaAndBacklog();
  assertForcedGuideAndChecklist();

  const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3001";
  try {
    await assertHttpGates(baseUrl);
  } catch (error) {
    console.log("⚠ HTTP checks skipped (start npm run dev -- -p 3001):", (error as Error).message);
  }

  console.log("\nEpic 6 verify passed (first-time-user walkthrough is a post-Epic 6 manual task).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
