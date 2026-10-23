"use client";

import Link from "next/link";
import { useState } from "react";

import { FirstReportBanner } from "@/components/onboarding/FirstReportBanner";
import { ConnectorCard } from "@/components/connectors/ConnectorCard";
import { JiraConnectorCard } from "@/components/connectors/JiraConnectorCard";
import { GenerateReportButton } from "@/components/projects/GenerateReportButton";
import type { ConnectorType } from "@/lib/connectors/types";
import { ProjectRaidLogTab } from "@/components/projects/ProjectRaidLogTab";
import { RAGBadge } from "@/components/slides/RAGBadge";
import type { Project } from "@/context/ProjectContext";
import { useProjectContext } from "@/context/ProjectContext";
import { formatLatestReportLabel } from "@/lib/projects/formatReportLabel";
import { formatRagTrendLabel } from "@/lib/projects/ragTrend";
import type { RaidLogEntry } from "@/lib/projects/raidLog";
import type { ProjectLatestReport } from "@/types/project";
import type { ProjectReportListItem } from "@/types/project-detail";
import type { RAGStatus } from "@/types/report";

type ProjectTab = "reports" | "raid" | "settings";

interface ProjectDetailContentProps {
  project: Project;
  latestReport: ProjectLatestReport | null;
  reports: ProjectReportListItem[];
  raidEntries: RaidLogEntry[];
  openJiraSetup?: boolean;
  openSetupType?: ConnectorType | null;
  showFirstReportBanner?: boolean;
}

export function ProjectDetailContent({
  project,
  latestReport,
  reports,
  raidEntries,
  openJiraSetup = false,
  openSetupType = null,
  showFirstReportBanner = false,
}: ProjectDetailContentProps) {
  const { setActiveProject } = useProjectContext();
  const [activeTab, setActiveTab] = useState<ProjectTab>(openJiraSetup || openSetupType ? "settings" : "reports");

  const tabs: { id: ProjectTab; label: string }[] = [
    { id: "reports", label: "Reports" },
    { id: "raid", label: "RAID Log" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="bg-background-primary px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Link href="/dashboard" className="text-sm text-text-muted hover:text-text-primary">
              ← Back to dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-text-primary md:text-3xl">{project.name}</h1>
              <p className="mt-1 text-sm text-text-secondary">{project.clientName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {latestReport ? (
                <>
                  <RAGBadge status={latestReport.ragStatus as RAGStatus} size="small" />
                  <span className="text-sm text-text-muted">Last report: {formatLatestReportLabel(latestReport)}</span>
                </>
              ) : (
                <span className="text-sm text-text-muted">No reports generated yet</span>
              )}
            </div>
          </div>
          <GenerateReportButton projectId={project.id} />
        </div>

        <FirstReportBanner visible={showFirstReportBanner} projectId={project.id} />

        <div className="border-b border-border">
          <nav className="-mb-px flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-accent-blue text-text-primary"
                    : "border-transparent text-text-muted hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "reports" ? (
          <section className="space-y-4">
            {reports.length === 0 ? (
              <div className="rounded-panel border border-dashed border-border bg-background-card/50 px-6 py-10 text-center">
                <p className="text-sm text-text-secondary">No reports yet. Generate your first report.</p>
                <Link
                  href={`/input?projectId=${project.id}`}
                  onClick={() => setActiveProject(project)}
                  className="mt-4 inline-block text-sm font-medium text-accent-blue hover:underline"
                >
                  Generate your first report →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <article key={report.id} className="rounded-panel border border-border bg-background-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <RAGBadge status={report.ragStatus as RAGStatus} size="mini" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">{report.weekLabel}</p>
                          <p className="text-xs text-text-muted">
                            {new Date(report.periodFrom).toLocaleDateString()} –{" "}
                            {new Date(report.periodTo).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            report.ragTrend === "improved"
                              ? "text-rag-green"
                              : report.ragTrend === "degraded"
                                ? "text-rag-amber"
                                : "text-text-muted"
                          }`}
                        >
                          {formatRagTrendLabel(report.ragTrend)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-xs text-text-muted">
                          Generated {new Date(report.generatedAt).toLocaleDateString()}
                        </p>
                        <Link
                          href={`/projects/${project.id}/reports/${report.id}`}
                          className="text-sm font-medium text-accent-blue hover:underline"
                        >
                          View Report →
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "raid" ? <ProjectRaidLogTab entries={raidEntries} /> : null}

        {activeTab === "settings" ? (
          <div className="space-y-6">
            <section className="rounded-panel border border-border bg-background-card p-6">
              <h2 className="text-lg font-semibold text-text-primary">Project settings</h2>
              <dl className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Phase</dt>
                  <dd className="mt-1 text-sm text-text-primary">{project.phase}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Engagement model</dt>
                  <dd className="mt-1 text-sm text-text-primary">
                    {project.engagementModel === "TNM" ? "T&M" : "Fixed Price"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Contract value</dt>
                  <dd className="mt-1 text-sm text-text-primary">
                    {project.currency} {project.contractValue.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-text-muted">Timeline</dt>
                  <dd className="mt-1 text-sm text-text-primary">
                    {project.startDate.slice(0, 10)} → {project.endDate.slice(0, 10)}
                  </dd>
                </div>
              </dl>
            </section>

            <JiraConnectorCard
              projectId={project.id}
              projectName={project.name}
              autoOpenWizard={openJiraSetup || openSetupType === "JIRA"}
            />
            <ConnectorCard
              type="ASANA"
              projectId={project.id}
              projectName={project.name}
              autoOpenWizard={openSetupType === "ASANA"}
            />
            <ConnectorCard
              type="MONDAY"
              projectId={project.id}
              projectName={project.name}
              autoOpenWizard={openSetupType === "MONDAY"}
            />
            <ConnectorCard
              type="TRELLO"
              projectId={project.id}
              projectName={project.name}
              autoOpenWizard={openSetupType === "TRELLO"}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
