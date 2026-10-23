"use client";

import Link from "next/link";

interface FirstReportBannerProps {
  visible: boolean;
  projectId: string;
}

export function FirstReportBanner({ visible, projectId }: FirstReportBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="rounded-panel border border-cyan/30 bg-cyan/5 px-4 py-3 text-sm text-text-secondary">
      Your first weekly report is the aha moment. Use{" "}
      <span className="font-medium text-text-primary">Generate Report</span> on this project, or{" "}
      <Link href={`/input?projectId=${projectId}&manual=true`} className="font-medium text-accent-blue hover:underline">
        enter data manually
      </Link>
      .
    </div>
  );
}
