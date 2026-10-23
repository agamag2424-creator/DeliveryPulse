"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useProjectContext } from "@/context/ProjectContext";

export function ProjectInputBanner() {
  const { project } = useProjectContext();
  const searchParams = useSearchParams();
  const [jiraConnected, setJiraConnected] = useState<boolean | null>(null);

  const isManualMode = searchParams.get("manual") === "true";

  useEffect(() => {
    if (!project?.id) {
      return;
    }
    void fetch(`/api/connectors/status?projectId=${project.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { anyActive?: boolean } | null) => {
        setJiraConnected(Boolean(payload?.anyActive));
      })
      .catch(() => setJiraConnected(false));
  }, [project?.id]);

  if (!project) {
    return null;
  }

  return (
    <div className="border-b border-border bg-background-card px-4 py-4 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
        {isManualMode && jiraConnected === false ? (
          <div className="rounded-lg border border-cyan/30 bg-cyan/5 px-4 py-3 text-sm text-cyan-strong">
            No tools connected — entering manually.{" "}
            <Link href={`/projects/${project.id}?jiraSetup=true`} className="font-medium underline">
              Connect a tool to automate this
            </Link>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Active project</p>
            <p className="text-sm font-medium text-text-primary">
              Generating report for: {project.name} — {project.clientName}
            </p>
          </div>
          <Link href={`/projects/${project.id}`} className="text-sm text-accent-blue hover:underline">
            Back to project →
          </Link>
        </div>
      </div>
    </div>
  );
}
