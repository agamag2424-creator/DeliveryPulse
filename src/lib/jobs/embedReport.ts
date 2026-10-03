import { chunkReport } from "@/lib/embeddings/chunkReport";
import { embedBatch } from "@/lib/embeddings/embed";
import { storeReportEmbeddings } from "@/lib/db/embeddings";
import { prisma } from "@/lib/prisma";
import type { ReportOutput } from "@/lib/reportOutputSchema";

export async function embedReport(reportId: string): Promise<void> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { project: { select: { organizationId: true } } },
  });
  if (!report) {
    throw new Error(`Report not found: ${reportId}`);
  }

  const output = report.outputSnapshot as ReportOutput;
  const chunks = chunkReport(report, output);
  if (chunks.length === 0) {
    return;
  }

  const embeddings = await embedBatch(
    chunks.map((chunk) => chunk.content),
    { organizationId: report.project.organizationId, userId: report.userId ?? undefined },
  );
  await storeReportEmbeddings(report, chunks, embeddings);
  console.log(`embedReport: stored ${chunks.length} embeddings for report ${reportId}`);
}
