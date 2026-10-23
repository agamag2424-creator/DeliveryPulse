"use client";

import { useSession } from "next-auth/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ReportOutput } from "@/lib/reportOutputSchema";
import type { ReportInput } from "@/types/report";

/** Phase 2 project record — mirrors Prisma Project model */
export interface Project {
  id: string;
  name: string;
  clientName: string;
  startDate: string;
  endDate: string;
  phase: string;
  engagementModel: string;
  currency: string;
  contractValue: number;
  isArchived: boolean;
}

export interface ProjectContextValue {
  userId: string | null;
  projectId: string | null;
  project: Project | null;
  projects: Project[];
  setActiveProject: (project: Project) => void;
  loadProjects: () => Promise<Project[]>;
  saveReport: (input: ReportInput, output: ReportOutput) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [bypassUserId, setBypassUserId] = useState<string | null>(null);

  const userId = session?.user?.id ?? bypassUserId;
  const isLoading = status === "loading" || isLoadingProjects;

  useEffect(() => {
    if (session?.user?.id || status === "loading") {
      return;
    }

    void fetch("/api/auth/effective-user")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { userId?: string } | null) => {
        if (payload?.userId) {
          setBypassUserId(payload.userId);
        }
      })
      .catch(console.error);
  }, [session?.user?.id, status]);

  const loadProjects = useCallback(async (): Promise<Project[]> => {
    setIsLoadingProjects(true);
    setError(null);

    try {
      const response = await fetch("/api/projects");
      if (response.status === 401) {
        setProjects([]);
        return [];
      }
      if (!response.ok) {
        throw new Error("Failed to load projects");
      }
      const payload = (await response.json()) as { projects: Project[] };
      setProjects(payload.projects);
      return payload.projects;
    } catch (loadError) {
      console.error(loadError);
      setError("Failed to load projects");
      return [];
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      void loadProjects();
    }
  }, [loadProjects, userId]);

  const setActiveProject = useCallback((nextProject: Project) => {
    setProject(nextProject);
    setProjectId(nextProject.id);
  }, []);

  const saveReport = useCallback(
    async (input: ReportInput, output: ReportOutput) => {
      if (!userId || !projectId) {
        return;
      }

      const response = await fetch(`/api/projects/${projectId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, output }),
      });

      if (!response.ok) {
        throw new Error("Failed to save report");
      }
    },
    [projectId, userId],
  );

  const value = useMemo<ProjectContextValue>(
    () => ({
      userId,
      projectId,
      project,
      projects,
      setActiveProject,
      loadProjects,
      saveReport,
      isLoading,
      error,
    }),
    [error, isLoading, loadProjects, project, projectId, projects, saveReport, userId],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within ProjectProvider");
  }
  return context;
}
