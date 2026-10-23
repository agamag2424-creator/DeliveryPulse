"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BILLING_UPGRADE_PATH } from "@/lib/usage/constants";

type UsageSnapshot = {
  hasPaidAccess: boolean;
  used: number;
  limit: number;
  remaining: number | null;
};

export function UsageQuotaBanner() {
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);

  useEffect(() => {
    void fetch("/api/usage")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: UsageSnapshot | null) => {
        if (payload) {
          setUsage(payload);
        }
      })
      .catch(() => undefined);
  }, []);

  if (!usage || usage.hasPaidAccess || usage.remaining === null) {
    return null;
  }

  if (usage.remaining === 0) {
    return (
      <div className="rounded-panel border border-rag-amber/40 bg-rag-amber/10 px-4 py-3 text-sm text-ink">
        Free plan limit reached ({usage.limit} reports this month).{" "}
        <Link href={BILLING_UPGRADE_PATH} className="font-semibold text-cyan-strong underline">
          Upgrade to Pro
        </Link>{" "}
        to generate more.
      </div>
    );
  }

  if (usage.remaining > 2) {
    return null;
  }

  return (
    <div className="rounded-panel border border-line bg-paper px-4 py-3 text-sm text-text-secondary">
      {usage.remaining} of {usage.limit} free reports left this month.{" "}
      <Link href={BILLING_UPGRADE_PATH} className="font-medium text-cyan-strong hover:underline">
        Upgrade to Pro
      </Link>
    </div>
  );
}
