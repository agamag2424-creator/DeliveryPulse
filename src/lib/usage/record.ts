import type { UsageKind, UsageStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function recordUsageEvent(params: {
  organizationId: string;
  userId?: string | null;
  kind: UsageKind;
  status: UsageStatus;
  provider?: string | null;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  error?: string | null;
}): Promise<void> {
  try {
    await prisma.usageEvent.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId ?? undefined,
        kind: params.kind,
        status: params.status,
        provider: params.provider ?? undefined,
        model: params.model ?? undefined,
        inputTokens: params.inputTokens ?? 0,
        outputTokens: params.outputTokens ?? 0,
        error: params.error?.slice(0, 500),
      },
    });
  } catch (error) {
    console.error("Failed to record usage event:", error);
  }
}
