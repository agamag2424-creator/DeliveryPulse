import { redirect } from "next/navigation";

import { HistoricalReportViewer } from "@/components/reports/HistoricalReportViewer";
import { auth } from "@/auth";
import { getOrgContext } from "@/lib/org/context";
import { getProject } from "@/lib/db/projects";
import { getReport } from "@/lib/db/reports";
import { isCloudBridgeProject } from "@/lib/sample/cloudbridge-project";
import type { ReportInput, SlideData } from "@/types/report";

interface HistoricalReportPageProps {
  params: Promise<{ id: string; reportId: string }>;
}

export default async function HistoricalReportPage({ params }: HistoricalReportPageProps) {
  const session = await auth();
  const { id: projectId, reportId } = await params;

  if (!session?.user && process.env.AUTH_BYPASS !== "true") {
    redirect("/login");
  }

  const ctx = await getOrgContext();
  if (!ctx) {
    redirect("/dashboard");
  }

  const project = await getProject(ctx.organizationId, projectId);
  if (!project || isCloudBridgeProject(project.name)) {
    redirect("/dashboard");
  }

  const report = await getReport(ctx.organizationId, reportId);
  if (!report || report.projectId !== projectId) {
    redirect(`/projects/${projectId}`);
  }

  return (
    <HistoricalReportViewer
      projectId={projectId}
      weekLabel={report.weekLabel}
      reportInput={report.inputSnapshot as unknown as ReportInput}
      reportOutput={report.outputSnapshot as unknown as SlideData}
    />
  );
}
