function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  process.env.DATABASE_URL ??=
    "postgresql://postgres:postgres@localhost:51214/template1?sslmode=disable";

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
