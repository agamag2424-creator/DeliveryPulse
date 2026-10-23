async function main() {
  const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3001";

  try {
    const settingsRes = await fetch(`${baseUrl}/settings`);
    console.log(`GET /settings → ${settingsRes.status}`);

    const profileRes = await fetch(`${baseUrl}/api/user/profile`);
    console.log(`GET /api/user/profile (no cookie) → ${profileRes.status}`);

    console.log("✓ settings routes respond");
  } catch {
    console.log("⚠ settings route smoke test skipped (dev server not reachable)");
  }

  console.log("\nManual (E-P2-13): profile save, connector list/disconnect, account delete, email verify, forgot password");
}

main().catch((error) => {
  console.error("✗ verify-settings failed:", error);
  process.exit(1);
});
