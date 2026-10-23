"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { RAGBadge } from "@/components/slides/RAGBadge";
import { UsageQuotaBanner } from "@/components/usage/UsageQuotaBanner";
import type { Project } from "@/context/ProjectContext";
import { useProjectContext } from "@/context/ProjectContext";
import type { OnboardingStatus } from "@/lib/onboarding/types";
import { formatLatestReportLabel } from "@/lib/projects/formatReportLabel";
import { isCloudBridgeProject } from "@/lib/sample/cloudbridge-project";
import type { ProjectWithLatestReport } from "@/types/project";
import type { RAGStatus } from "@/types/report";

interface DashboardContentProps {
  initialProjects: ProjectWithLatestReport[];
  userName?: string | null;
  userEmail?: string | null;
  onboarding?: OnboardingStatus | null;
}

function getFirstName(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    return name.trim().split(/\s+/)[0] ?? "there";
  }
  if (email?.trim()) {
    const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
    if (localPart) {
      return localPart.split(/\s+/)[0] ?? "there";
    }
  }
  return "there";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

export function DashboardContent({
  initialProjects,
  userName,
  userEmail,
  onboarding = null,
}: DashboardContentProps) {
  const router = useRouter();
  const { setActiveProject } = useProjectContext();
  const [projects, setProjects] = useState(initialProjects);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const guideOpen = Boolean(onboarding?.blocking);
  const [checklist, setChecklist] = useState(onboarding);

  const greeting = getGreeting();
  const firstName = getFirstName(userName, userEmail);

  function handleProjectCreated(project: Project) {
    setShowCreateModal(false);
    setActiveProject(project);
    setProjects((current) => [
      { ...project, latestReport: null },
      ...current.filter((item) => item.id !== project.id),
    ]);
    if (guideOpen) {
      return;
    }
    router.push(`/projects/${project.id}`);
    router.refresh();
  }

  return (
    <>
      <div className="bg-background-primary px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <section className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="font-display text-2xl font-bold tracking-[-0.03em] text-ink md:text-3xl">
                {greeting}, {firstName}.
              </h1>
              <p className="text-sm text-text-secondary">
                You have {projects.length} active project{projects.length === 1 ? "" : "s"}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="rounded-[3px] bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:bg-black"
            >
              + New Project
            </button>
          </section>

          <UsageQuotaBanner />

          {checklist?.showChecklist && !guideOpen ? (
            <OnboardingChecklist initialStatus={checklist} onStatusChange={setChecklist} />
          ) : null}

          <section className="space-y-3">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-strong">Active Projects</h2>
            {projects.length === 0 ? (
              <div className="rounded-panel border border-dashed border-line bg-paper/70 px-6 py-10 text-center">
                <p className="text-sm text-text-secondary">Create your first project to generate a weekly report.</p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 text-sm font-medium text-cyan-strong hover:underline"
                >
                  + Create New Project
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {projects
                  .filter((project) => !isCloudBridgeProject(project.name))
                  .map((project) => (
                    <article key={project.id} className="rounded-panel border border-line bg-paper p-5">
                      <h3 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">{project.name}</h3>
                      <p className="mt-1 text-sm text-text-secondary">{project.clientName}</p>
                      <p className="mt-2 text-xs text-text-muted">
                        {project.phase} · {project.engagementModel === "TNM" ? "T&M" : "Fixed Price"}
                      </p>
                      {project.latestReport ? (
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <RAGBadge status={project.latestReport.ragStatus as RAGStatus} size="mini" />
                          <span className="text-xs text-text-muted">{formatLatestReportLabel(project.latestReport)}</span>
                        </div>
                      ) : null}
                      <Link
                        href={`/projects/${project.id}`}
                        onClick={() => setActiveProject(project)}
                        className="mt-4 inline-block text-sm font-medium text-cyan-strong hover:underline"
                      >
                        Open →
                      </Link>
                    </article>
                  ))}
              </div>
            )}
          </section>

          {userEmail ? <p className="text-xs text-text-muted">Signed in as {userEmail}</p> : null}
        </div>
      </div>

      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleProjectCreated}
      />

      {guideOpen ? <OnboardingFlow onProjectCreated={handleProjectCreated} /> : null}
    </>
  );
}
