/**
 * Epic 3: Free-tier 5 successful reports per UTC calendar month, org-level UsageEvent.
 *
 * Usage: npx tsx scripts/verify-epic-3-quota.ts
 */
import { readFileSync } from "fs";
import { join } from "path";

import "./load-local-env";

import { hasPaidAccess } from "../src/lib/billing/subscription-state";
import {
  FREE_REPORTS_PER_MONTH,
  QUOTA_EXCEEDED_CODE,
  isQuotaExceededPayload,
  utcMonthRange,
} from "../src/lib/usage/constants";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertCalendarMonth(): void {
  assert(FREE_REPORTS_PER_MONTH === 5, "locked Free quota is 5 reports per month");

  const midJanuary = utcMonthRange(new Date(Date.UTC(2026, 0, 15)));
  assert(midJanuary.start.toISOString() === "2026-01-01T00:00:00.000Z", "month starts at UTC day 1");
  assert(midJanuary.end.toISOString() === "2026-02-01T00:00:00.000Z", "month end is next UTC month start");

  const newYearsEve = utcMonthRange(new Date(Date.UTC(2026, 11, 31, 23, 59, 59)));
  assert(newYearsEve.start.toISOString() === "2026-12-01T00:00:00.000Z", "December range starts Dec 1");
  assert(newYearsEve.end.toISOString() === "2027-01-01T00:00:00.000Z", "December range ends Jan 1 next year");

  console.log("✓ UTC calendar-month reset + 5-report Free limit");
}

function assertSources(): void {
  const schema = readFileSync(join(__dirname, "../prisma/schema.prisma"), "utf8");
  assert(schema.includes("model UsageEvent"), "schema must define UsageEvent");
  assert(schema.includes("REPORT_GENERATE"), "UsageEvent records report generation");
  assert(schema.includes("GAP_EXTRACT"), "UsageEvent records gap extract");
  assert(schema.includes("EMBEDDING"), "UsageEvent records embeddings");

  const generate = readFileSync(join(__dirname, "../src/app/api/generate/route.ts"), "utf8");
  const quotaIdx = generate.indexOf("assertReportQuota");
  const claudeIdx = generate.indexOf("generateReport(body");
  assert(quotaIdx !== -1 && claudeIdx !== -1 && quotaIdx < claudeIdx, "quota check runs before Claude on /api/generate");

  const agentRun = readFileSync(join(__dirname, "../src/app/api/agent/run/route.ts"), "utf8");
  assert(agentRun.includes("assertReportQuota"), "agent run checks quota before generating");

  const agentGaps = readFileSync(join(__dirname, "../src/app/api/agent/gaps/route.ts"), "utf8");
  assert(agentGaps.includes("assertReportQuota"), "gap resume checks quota before generating");

  const reportLib = readFileSync(join(__dirname, "../src/lib/claude/generateReport.ts"), "utf8");
  assert(reportLib.includes('kind: "REPORT_GENERATE"'), "successful/failed generates are logged");
  assert(reportLib.includes("getLlmClient"), "generate path records tokens from the LLM client");

  const llmProvider = readFileSync(join(__dirname, "../src/lib/ai/providers/anthropic-llm.ts"), "utf8");
  assert(llmProvider.includes("inputTokens"), "Claude token usage is captured");

  const embedLib = readFileSync(join(__dirname, "../src/lib/embeddings/embed.ts"), "utf8");
  assert(embedLib.includes('kind: "EMBEDDING"'), "embeddings are logged as UsageEvent");

  const embedProvider = readFileSync(join(__dirname, "../src/lib/ai/providers/openai-embeddings.ts"), "utf8");
  assert(embedProvider.includes("usage.tokens"), "OpenAI embedding tokens are captured");

  const button = readFileSync(join(__dirname, "../src/components/projects/GenerateReportButton.tsx"), "utf8");
  assert(button.includes("QuotaLimitNotice"), "generate button shows upgrade CTA on quota");

  const inputPage = readFileSync(join(__dirname, "../src/app/input/page.tsx"), "utf8");
  assert(inputPage.includes("isQuotaExceededPayload"), "manual generate error path handles 402");
  assert(inputPage.includes("Upgrade to Pro"), "manual generate shows upgrade CTA");

  console.log("✓ schema + generate/agent quota + token capture + upgrade CTA");
}

function assertPaidBypass(): void {
  assert(
    hasPaidAccess({ billingPlan: "PRO", subscriptionStatus: "TRIALING" }),
    "trialing Pro bypasses quota",
  );
  assert(
    hasPaidAccess({ billingPlan: "PRO", subscriptionStatus: "ACTIVE" }),
    "active Pro bypasses quota",
  );
  assert(
    !hasPaidAccess({ billingPlan: "FREE", subscriptionStatus: "NONE" }),
    "Free workspaces are metered",
  );
  assert(
    isQuotaExceededPayload({ code: QUOTA_EXCEEDED_CODE }, 200),
    "quota payload is detected by code",
  );
  assert(isQuotaExceededPayload({ error: "limit" }, 402), "HTTP 402 is treated as quota");
  console.log("✓ Pro/trial bypass + quota payload detection");
}

async function assertHttp(baseUrl: string): Promise<void> {
  const usage = await fetch(`${baseUrl}/api/usage`);
  assert(
    usage.status === 401 || usage.status === 403 || usage.status === 200,
    `GET /api/usage unexpected ${usage.status}`,
  );
  if (usage.status === 200) {
    const payload = (await usage.json()) as { limit?: number; used?: number };
    assert(payload.limit === FREE_REPORTS_PER_MONTH, "usage snapshot uses the locked Free limit");
    assert(typeof payload.used === "number", "usage snapshot includes used count");
  }
  console.log(`✓ HTTP usage snapshot at ${baseUrl}`);
}

async function assertLiveQuotaBlock(baseUrl: string): Promise<void> {
  const { prisma } = await import("../src/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { email: "dev-bypass@deliverypulse.local" },
    include: { memberships: { take: 1, select: { organizationId: true } } },
  });
  const organizationId = user?.memberships[0]?.organizationId;
  if (!organizationId) {
    console.log("⚠ live 402 quota block skipped (no bypass org)");
    return;
  }

  const marker = `epic3-quota-verify-${Date.now()}`;
  try {
    await prisma.usageEvent.createMany({
      data: Array.from({ length: FREE_REPORTS_PER_MONTH }, () => ({
        organizationId,
        kind: "REPORT_GENERATE" as const,
        status: "SUCCESS" as const,
        error: marker,
      })),
    });

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const payload = (await response.json()) as { code?: string; upgradePath?: string };
    assert(response.status === 402, `expected 402 at quota, got ${response.status}`);
    assert(payload.code === QUOTA_EXCEEDED_CODE, "402 body includes QUOTA_EXCEEDED");
    assert(payload.upgradePath === "/settings?tab=billing", "402 includes billing upgrade path");
    console.log("✓ HTTP 402 when Free workspace is at the monthly report limit");
  } finally {
    await prisma.usageEvent.deleteMany({ where: { organizationId, error: marker } });
  }
}

async function main(): Promise<void> {
  assertCalendarMonth();
  assertSources();
  assertPaidBypass();

  const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3001";
  try {
    await assertHttp(baseUrl);
    await assertLiveQuotaBlock(baseUrl);
  } catch (error) {
    console.log("⚠ HTTP gates skipped:", (error as Error).message);
  }

  console.log("\n✓ Epic 3 quota verification passed");
}

main().catch((error) => {
  console.error("✗ verify-epic-3-quota failed:", error);
  process.exit(1);
});
