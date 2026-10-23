export const FREE_REPORTS_PER_MONTH = 5;
export const QUOTA_EXCEEDED_CODE = "QUOTA_EXCEEDED";
export const BILLING_UPGRADE_PATH = "/settings?tab=billing";

export type UsageActor = {
  organizationId: string;
  userId?: string;
};

export function utcMonthRange(now = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export class QuotaExceededError extends Error {
  readonly code = "QUOTA_EXCEEDED" as const;

  constructor(
    readonly used: number,
    readonly limit: number,
    readonly periodEnd: Date,
  ) {
    super(
      `Free plan limit reached (${limit} reports this calendar month). Upgrade to Pro to generate more.`,
    );
    this.name = "QuotaExceededError";
  }
}

export type QuotaErrorPayload = {
  error?: string;
  code?: string;
  upgradePath?: string;
  used?: number;
  limit?: number;
};

export function isQuotaExceededPayload(payload: unknown, status?: number): boolean {
  if (status === 402) {
    return true;
  }
  if (typeof payload !== "object" || payload === null) {
    return false;
  }
  return (payload as QuotaErrorPayload).code === QUOTA_EXCEEDED_CODE;
}
