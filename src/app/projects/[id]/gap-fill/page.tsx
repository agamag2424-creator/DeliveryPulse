import Link from "next/link";
import { redirect } from "next/navigation";

import { GapFillPageClient } from "@/components/projects/GapFillPageClient";
import { auth } from "@/auth";
import { getOrgContext } from "@/lib/org/context";
import { getProject } from "@/lib/db/projects";
import { isCloudBridgeProject } from "@/lib/sample/cloudbridge-project";

interface GapFillPageProps {
  params: Promise<{ id: string }>;
}

export default async function GapFillPage({ params }: GapFillPageProps) {
  const session = await auth();
  const { id } = await params;

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

  return (
    <main className="bg-background-primary px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto mb-6 max-w-3xl">
        <Link href={`/projects/${id}`} className="text-sm text-text-muted hover:text-text-primary">
          ← Back to project
        </Link>
      </div>
      <GapFillPageClient projectId={project.id} projectName={project.name} />
    </main>
  );
}
