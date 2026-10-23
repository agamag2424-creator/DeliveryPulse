/**
 * E-P2-03 verification script — run from delivery-pulse:
 *   npx tsx scripts/verify-embeddings.ts
 */
import type { Report } from "@prisma/client";

import { cloudBridgeSampleReportInput } from "../src/data/cloudbridge-sample";
import { chunkReport, validateEmbedChunks } from "../src/lib/embeddings/chunkReport";
import { cloudBridgeReportOutputFixture } from "../src/lib/embeddings/fixtures/cloudbridge-report-output";
import { embedText } from "../src/lib/embeddings/embed";

const mockReport = {
  id: "report_test_id",
  projectId: "project_test_id",
  userId: "user_test_id",
  weekLabel: "W14",
  periodFrom: new Date("2026-04-07"),
  periodTo: new Date("2026-04-13"),
  inputSnapshot: cloudBridgeSampleReportInput,
  outputSnapshot: cloudBridgeReportOutputFixture,
  ragStatus: "AMBER",
  ragAiSuggested: "AMBER",
  ragOverridden: false,
  generatedAt: new Date(),
} as Report;

function main(): void {
  const chunks = chunkReport(mockReport, cloudBridgeReportOutputFixture);
  validateEmbedChunks(chunks);

  console.log(`chunkReport: ${chunks.length} chunks`);
  console.log(
    chunks.map((chunk) => `${chunk.chunkType} (${chunk.content.split(/\s+/).length} words)`).join("\n"),
  );

  if (chunks.length < 15 || chunks.length > 25) {
    throw new Error(`Expected 15–25 chunks, got ${chunks.length}`);
  }

  console.log("chunkReport acceptance: PASS");
}

async function mainAsync(): Promise<void> {
  main();

  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.log("embedText: SKIP (OPENAI_API_KEY not set)");
    return;
  }

  const vector = await embedText("DeliveryPulse embedding infrastructure test");
  if (vector.length !== 1536) {
    throw new Error(`Expected 1536-dimension vector, got ${vector.length}`);
  }

  console.log("embedText acceptance: PASS (1536 dimensions)");
}

void mainAsync().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
