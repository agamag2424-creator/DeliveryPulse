"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { GapFillForm } from "@/components/projects/GapFillForm";
import { loadGapFillSession, type GapFillSession } from "@/lib/agent/gapFillSession";

interface GapFillPageClientProps {
  projectId: string;
  projectName: string;
}

export function GapFillPageClient({ projectId, projectName }: GapFillPageClientProps) {
  const [session, setSession] = useState<GapFillSession | null>(null);

  useEffect(() => {
    setSession(loadGapFillSession(projectId));
  }, [projectId]);

  if (!session) {
    return (
      <div className="rounded-panel border border-dashed border-border px-6 py-10 text-center">
        <p className="text-sm text-text-secondary">No gap-fill session found. Run the agent from the project page first.</p>
        <Link href={`/projects/${projectId}`} className="mt-4 inline-block text-sm text-accent-blue hover:underline">
          Back to project →
        </Link>
      </div>
    );
  }

  return <GapFillForm projectId={projectId} projectName={projectName} session={session} />;
}
