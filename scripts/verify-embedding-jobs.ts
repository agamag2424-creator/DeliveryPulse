function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  process.env.DATABASE_URL ??=
    "postgresql://delivery_pulse@localhost:5432/delivery_pulse_development";
  process.env.DIRECT_URL ??= process.env.DATABASE_URL;
  const { assertSafeDevelopmentDatabaseEnvironment } = await import(
    "../src/lib/db/development-database-safety"
  );
  assertSafeDevelopmentDatabaseEnvironment();

  const { embedReport } = await import("../src/lib/jobs/embedReport");
  const { projectEmbeddingExists } = await import("../src/lib/db/embeddings");

  assert(typeof embedReport === "function", "embedReport export exists");
  assert(typeof projectEmbeddingExists === "function", "projectEmbeddingExists export exists");

  console.log("✓ embedding job modules load");

  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.log("⊘ embedReport live run skipped (OPENAI_API_KEY not set)");
  } else {
    console.log("ℹ Run embedReport(reportId) manually against a saved report to verify DB rows");
  }

  console.log("\nManual (E-P2-13): save report → embeddings appear in ReportEmbedding within ~10s");
}

main().catch((error) => {
  console.error("✗ verify-embedding-jobs failed:", error);
  process.exit(1);
});
