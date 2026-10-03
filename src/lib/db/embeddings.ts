import { randomUUID } from "node:crypto";

import type { Report } from "@prisma/client";

import type { EmbedChunk } from "@/lib/embeddings/chunkReport";
import { prisma } from "@/lib/prisma";

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function storeReportEmbeddings(
  report: Report,
  chunks: EmbedChunk[],
  embeddings: number[][],
): Promise<void> {
  if (chunks.length !== embeddings.length) {
    throw new Error("Chunks and embeddings arrays must be the same length.");
  }

  const ownedReport = await prisma.report.findUnique({ where: { id: report.id } });
  if (!ownedReport) {
    throw new Error("Report not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.reportEmbedding.deleteMany({ where: { reportId: report.id } });

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const embedding = embeddings[index];
      const id = randomUUID();
      const metadataJson = JSON.stringify(chunk.metadata);

      await tx.$executeRawUnsafe(
        `INSERT INTO "ReportEmbedding" (id, "reportId", "userId", "projectId", content, embedding, "chunkType", metadata, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6::vector, $7, $8::jsonb, NOW())`,
        id,
        report.id,
        report.userId ?? "system",
        report.projectId,
        chunk.content,
        toVectorLiteral(embedding),
        chunk.chunkType,
        metadataJson,
      );
    }
  });
}

export async function projectEmbeddingExists(projectId: string, sourceRef: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM "ProjectEmbedding" WHERE "projectId" = $1 AND "sourceRef" = $2`,
    projectId,
    sourceRef,
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

export async function storeProjectEmbedding(
  projectId: string,
  userId: string,
  content: string,
  embedding: number[],
  sourceType: string,
  sourceRef?: string,
): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, isArchived: false },
  });
  if (!project) {
    throw new Error("Project not found");
  }

  const id = randomUUID();

  await prisma.$executeRawUnsafe(
    `INSERT INTO "ProjectEmbedding" (id, "projectId", "userId", content, embedding, "sourceType", "sourceRef", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5::vector, $6, $7, NOW(), NOW())`,
    id,
    projectId,
    userId,
    content,
    toVectorLiteral(embedding),
    sourceType,
    sourceRef ?? null,
  );
}
