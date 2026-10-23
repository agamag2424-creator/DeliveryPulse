"use client";

import Link from "next/link";

import { BILLING_UPGRADE_PATH } from "@/lib/usage/constants";

interface QuotaLimitNoticeProps {
  message: string;
  className?: string;
}

export function QuotaLimitNotice({ message, className }: QuotaLimitNoticeProps) {
  return (
    <div
      className={`rounded-lg border border-rag-amber/40 bg-rag-amber/10 px-4 py-3 text-sm text-rag-amber ${className ?? ""}`}
    >
      <p>{message}</p>
      <Link href={BILLING_UPGRADE_PATH} className="mt-2 inline-block font-semibold underline">
        Upgrade to Pro
      </Link>
    </div>
  );
}
