import { NextResponse } from "next/server";

import { hasPaidAccess } from "@/lib/billing/subscription-state";
import { prisma } from "@/lib/prisma";
import {
  BILLING_UPGRADE_PATH,
  FREE_REPORTS_PER_MONTH,
  QuotaExceededError,
  utcMonthRange,
} from "@/lib/usage/constants";

export async function countSuccessfulReportsThisMonth(organizationId: string): Promise<number> {
  const { start, end } = utcMonthRange();
  return prisma.usageEvent.count({
    where: {
      organizationId,
      kind: "REPORT_GENERATE",
      status: "SUCCESS",
      createdAt: { gte: start, lt: end },
    },
  });
}

export async function getUsageSnapshot(organizationId: string): Promise<{
  hasPaidAccess: boolean;
  used: number;
  limit: number;
  remaining: number | null;
  periodStart: string;
  periodEnd: string;
}> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { billingPlan: true, subscriptionStatus: true },
  });
  if (!organization) {
    throw new Error("Organization not found");
  }

  const paid = hasPaidAccess(organization);
  const { start, end } = utcMonthRange();
  const used = await countSuccessfulReportsThisMonth(organizationId);

  return {
    hasPaidAccess: paid,
    used,
    limit: FREE_REPORTS_PER_MONTH,
    remaining: paid ? null : Math.max(0, FREE_REPORTS_PER_MONTH - used),
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  };
}

export async function assertReportQuota(organizationId: string): Promise<void> {
  const snapshot = await getUsageSnapshot(organizationId);
  if (snapshot.hasPaidAccess) {
    return;
  }
  if (snapshot.used >= snapshot.limit) {
    throw new QuotaExceededError(snapshot.used, snapshot.limit, new Date(snapshot.periodEnd));
  }
}

export function quotaExceededResponse(error: QuotaExceededError): NextResponse {
  return NextResponse.json(
    {
      error: error.message,
      code: error.code,
      used: error.used,
      limit: error.limit,
      periodEnd: error.periodEnd.toISOString(),
      upgradePath: BILLING_UPGRADE_PATH,
    },
    { status: 402 },
  );
}

export function isQuotaExceededError(error: unknown): error is QuotaExceededError {
  return error instanceof QuotaExceededError;
}
