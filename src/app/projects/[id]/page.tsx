import { redirect } from "next/navigation";

import { ProjectDetailContent } from "@/components/projects/ProjectDetailContent";
import { auth } from "@/auth";
import { getOnboardingStatus } from "@/lib/onboarding/status";
import { getOrgContext } from "@/lib/org/context";
import { getProject, getProjectsWithLatestReport } from "@/lib/db/projects";
import { getReports } from "@/lib/db/reports";
import { buildRaidLog } from "@/lib/projects/raidLog";
import { getRagTrend } from "@/lib/projects/ragTrend";
import { isCloudBridgeProject } from "@/lib/sample/cloudbridge-project";
import type { RAGStatus } from "@/types/report";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ jiraSetup?: string; setup?: string }>;
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const session = await auth();
  const { id } = await params;
  const query = await searchParams;
  const openJiraSetup = query.jiraSetup === "true";
  const setupSlug = query.setup?.toLowerCase();
  const openSetupType =
    setupSlug === "asana"
      ? "ASANA"
      : setupSlug === "monday"
        ? "MONDAY"
        : setupSlug === "trello"
          ? "TRELLO"
          : setupSlug === "jira"
            ? "JIRA"
            : null;

  if (!session?.user && process.env.AUTH_BYPASS !== "true") {
    redirect("/login");
  }

  const ctx = await getOrgContext();
  if (!ctx) {
    redirect("/dashboard");
  }

  const project = await getProject(ctx.organizationId, id);
  if (!project || isCloudBridgeProject(project.name)) {
    redirect("/dashboard");
  }

  const projectsWithReports = await getProjectsWithLatestReport(ctx.organizationId);
  const latestReport = projectsWithReports.find((item) => item.id === id)?.latestReport ?? null;
  const reportRecords = await getReports(ctx.organizationId, id);
  const sortedReports = [...reportRecords].sort(
    (a, b) => b.generatedAt.getTime() - a.generatedAt.getTime(),
  );

  const reports = sortedReports.map((report, index) => {
    const previous = sortedReports[index + 1];
    return {
      id: report.id,
      weekLabel: report.weekLabel,
      ragStatus: report.ragStatus,
      periodFrom: report.periodFrom.toISOString(),
      periodTo: report.periodTo.toISOString(),
      generatedAt: report.generatedAt.toISOString(),
      ragTrend: getRagTrend(
        report.ragStatus as RAGStatus,
        previous ? (previous.ragStatus as RAGStatus) : null,
      ),
    };
  });

  const raidEntries = buildRaidLog(
    reportRecords.map((report) => ({
      id: report.id,
      generatedAt: report.generatedAt,
      periodFrom: report.periodFrom,
      outputSnapshot: report.outputSnapshot,
    })),
  );

  const onboarding = await getOnboardingStatus(ctx.organizationId, ctx.role);

  return (
    <ProjectDetailContent
      project={project}
      latestReport={latestReport}
      reports={reports}
      raidEntries={raidEntries}
      openJiraSetup={openJiraSetup}
      openSetupType={openSetupType}
      showFirstReportBanner={!onboarding.ahaComplete}
    />
  );
}
