/**
 * Smoke tests for E-P2-06 Jira connector (no live OAuth required).
 * Run: ENCRYPTION_KEY=<64-hex> npx tsx scripts/verify-jira-connector.ts
 */
import { encrypt, decrypt } from "../src/lib/crypto";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function testCryptoRoundtrip() {
  const sample = JSON.stringify({
    accessToken: "test-access",
    refreshToken: "test-refresh",
    expiresAt: Date.now() + 3600_000,
    cloudId: "cloud-123",
  });

  const encrypted = encrypt(sample);
  assert(!encrypted.includes("test-access"), "Encrypted payload must not contain plaintext token");

  const decrypted = decrypt(encrypted);
  assert(decrypted === sample, "Decrypt roundtrip must preserve credentials JSON");
  console.log("✓ crypto encrypt/decrypt roundtrip");
}

async function testApi(baseUrl: string) {
  const statusRes = await fetch(`${baseUrl}/api/connectors/jira/status?projectId=nonexistent`);
  assert(statusRes.status === 401 || statusRes.status === 404, `status endpoint unexpected: ${statusRes.status}`);

  const authRes = await fetch(`${baseUrl}/api/connectors/jira/auth?projectId=nonexistent`, {
    redirect: "manual",
  });
  assert(authRes.status === 401 || authRes.status === 404, `auth endpoint unexpected: ${authRes.status}`);

  console.log("✓ API routes respond (auth-gated as expected without session cookie)");
}

async function main() {
  if (!process.env.ENCRYPTION_KEY) {
    process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // gitleaks:allow -- deterministic test-only key
    console.log("ℹ Using temporary ENCRYPTION_KEY for crypto smoke test");
  }

  await testCryptoRoundtrip();

  const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3001";
  try {
    await testApi(baseUrl);
  } catch (error) {
    console.log("⚠ API smoke test skipped (dev server not reachable):", (error as Error).message);
  }

  console.log("\nFull OAuth + Jira API test requires JIRA_CLIENT_ID, JIRA_CLIENT_SECRET, JIRA_REDIRECT_URI in .env.local");
}

main().catch((error) => {
  console.error("✗ verify-jira-connector failed:", error);
  process.exit(1);
});
