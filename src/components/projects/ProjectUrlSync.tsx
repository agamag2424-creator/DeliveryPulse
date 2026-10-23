"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import type { Project } from "@/context/ProjectContext";
import { useProjectContext } from "@/context/ProjectContext";

function ProjectUrlSyncInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userId, projectId, setActiveProject } = useProjectContext();

  useEffect(() => {
    if (!userId || pathname !== "/input") {
      return;
    }

    const urlProjectId = searchParams.get("projectId");
    if (!urlProjectId || urlProjectId === projectId) {
      return;
    }

    void fetch(`/api/projects/${urlProjectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { project?: Project } | null) => {
        if (payload?.project) {
          setActiveProject(payload.project);
        }
      })
      .catch(console.error);
  }, [userId, pathname, searchParams, projectId, setActiveProject]);

  return null;
}

export function ProjectUrlSync() {
  return (
    <Suspense fallback={null}>
      <ProjectUrlSyncInner />
    </Suspense>
  );
}
