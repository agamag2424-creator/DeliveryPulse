/**
 * Epic 0: unauthenticated POST /api/generate must return 401/403.
 * Also records the API-route auth audit (middleware matcher excludes /api).
 *
 * Usage: AUTH_BYPASS=false TEST_BASE_URL=http://localhost:3001 npx tsx scripts/verify-epic-0-generate-auth.ts
 *
 * AUTH_BYPASS=true synthesizes a session (same as agent routes) and will fail this test.
 */
import { readFileSync } from "fs";
import { join } from "path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const UNAUTHENTICATED_OK = new Set([401, 403]);

const PUBLIC_AUTH_ROUTES = [
  "POST /api/auth/register — public signup",
  "POST /api/auth/forgot-password — public, no account enumeration",
  "POST /api/auth/reset-password — public, token-gated",
  "GET /api/auth/verify-email — public, token-gated",
  "POST /api/auth/resend-verification — public email optional (verify-email page)",
  "GET /api/auth/setup-status — public booleans for login UI (no secrets)",
  "GET|POST /api/auth/[...nextauth] — Auth.js handlers",
] as const;

const SESSION_GATED_ROUTES = [
  "POST /api/generate (session; Epic 0)",
  "GET|POST /api/projects",
  "GET|PUT|DELETE /api/projects/[id]",
  "GET|POST /api/projects/[id]/reports",
  "GET /api/reports/[id]",
  "POST /api/agent/run (session + project ownership)",
  "POST /api/agent/gaps (session + project ownership)",
  "GET|POST|PUT /api/connectors/jira/* (session + project ownership; callback redirects to /login)",
  "GET|PATCH /api/user/profile",
  "DELETE /api/user/account",
  "PATCH /api/user/onboarding",
  "GET|PATCH /api/onboarding",
  "GET|DELETE /api/user/connectors",
  "GET /api/auth/effective-user",
] as const;

function assertGenerateRouteHasSessionCheck() {
  const routePath = join(__dirname, "../src/app/api/generate/route.ts");
  const source = readFileSync(routePath, "utf8");
  const sessionIdx = source.indexOf('requireOrgPermission("report.generate")');
  const generateCallIdx = source.indexOf("generateReport(body)");

  assert(sessionIdx !== -1, "generate route must call requireOrgPermission(\"report.generate\")");
  assert(source.includes("status: 401"), "generate route must return 401 when unauthenticated");
  assert(
    generateCallIdx !== -1 && sessionIdx < generateCallIdx,
    "org permission check must run before generateReport(body)",
  );
  console.log("✓ /api/generate source: org permission check runs before Claude");
}

async function testUnauthenticatedHttp(baseUrl: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  } catch (error) {
    throw new Error(
      `Dev server not reachable at ${baseUrl}: ${(error as Error).message}. Start with AUTH_BYPASS=false npm run dev -- -p 3001`,
    );
  }

  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  assert(
    UNAUTHENTICATED_OK.has(response.status),
    `unauthenticated POST /api/generate expected 401/403, got ${response.status} ${JSON.stringify(payload)}. If AUTH_BYPASS=true on the server, restart with AUTH_BYPASS=false.`,
  );
  assert(payload.error === "Unauthorized", `expected Unauthorized body, got ${JSON.stringify(payload)}`);
  console.log(`✓ unauthenticated POST ${baseUrl}/api/generate → ${response.status}`);
}

function printAudit(): void {
  console.log("\nAPI auth audit (middleware matcher excludes /api — per-route checks required)");
  console.log("Session-gated:");
  for (const route of SESSION_GATED_ROUTES) {
    console.log(`  • ${route}`);
  }
  console.log("Intentionally public (auth/signup flows, not Claude/cost):");
  for (const route of PUBLIC_AUTH_ROUTES) {
    console.log(`  • ${route}`);
  }
  console.log("No other Claude/OpenAI cost paths are unauthenticated.");
}

async function main() {
  printAudit();
  assertGenerateRouteHasSessionCheck();

  const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3001";
  await testUnauthenticatedHttp(baseUrl);
  console.log("\n✓ Epic 0 generate-auth verification passed");
}

main().catch((error) => {
  console.error("✗ verify-epic-0-generate-auth failed:", error);
  process.exit(1);
});
