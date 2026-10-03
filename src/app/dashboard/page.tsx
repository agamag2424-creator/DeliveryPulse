import { redirect } from "next/navigation";

import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { auth } from "@/auth";
import { getOnboardingStatus } from "@/lib/onboarding/status";
import { getProjectsWithLatestReport } from "@/lib/db/projects";
import { getOrgContext } from "@/lib/org/context";
import { isCloudBridgeProject } from "@/lib/sample/cloudbridge-project";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user && process.env.AUTH_BYPASS !== "true") {
    redirect("/login");
  }

  const ctx = await getOrgContext();
  const projects = ctx
    ? (await getProjectsWithLatestReport(ctx.organizationId)).filter((project) => !isCloudBridgeProject(project.name))
    : [];

  const onboarding = ctx ? await getOnboardingStatus(ctx.organizationId, ctx.role) : null;

  return (
    <DashboardContent
      initialProjects={projects}
      userEmail={session?.user?.email}
      userName={session?.user?.name}
      onboarding={onboarding}
    />
  );
}
