"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import type { Project } from "@/context/ProjectContext";
import { useProjectContext } from "@/context/ProjectContext";
import { useReportContext } from "@/context/ReportContext";
import { prefillReportInputFromProject } from "@/lib/projects/prefillReportInput";

function ProjectInputPrefillInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userId, projectId, project, setActiveProject } = useProjectContext();
  const { setReportInput } = useReportContext();
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || pathname !== "/input") {
      return;
    }

    if (searchParams.get("demo") === "true") {
      return;
    }

    const urlProjectId = searchParams.get("projectId");
    if (!urlProjectId) {
      return;
    }

    if (!project || project.id !== urlProjectId) {
      void fetch(`/api/projects/${urlProjectId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((payload: { project?: Project } | null) => {
          if (payload?.project) {
            setActiveProject(payload.project);
          }
        })
        .catch(console.error);
      return;
    }

    if (appliedRef.current === urlProjectId) {
      return;
    }

    setReportInput((current) => prefillReportInputFromProject(project, current));
    appliedRef.current = urlProjectId;
  }, [userId, pathname, searchParams, projectId, project, setActiveProject, setReportInput]);

  return null;
}

export function ProjectInputPrefill() {
  return (
    <Suspense fallback={null}>
      <ProjectInputPrefillInner />
    </Suspense>
  );
}
