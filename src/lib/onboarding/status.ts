import type { OrgRole } from "@prisma/client";

import { parseExternalConfig } from "@/lib/connectors/types";
import { JIRA_CONNECTOR_TYPE, parseJiraConfig } from "@/lib/db/connectors";
import { can } from "@/lib/org/permissions";
import { prisma } from "@/lib/prisma";
import { isCloudBridgeProject } from "@/lib/sample/cloudbridge-project";

import type { OnboardingItem, OnboardingStatus } from "./types";

function bindingSetupComplete(type: string, config: unknown): boolean {
  if (type === JIRA_CONNECTOR_TYPE) {
    return parseJiraConfig(config).setupComplete;
  }
  return parseExternalConfig(config).setupComplete;
}

export async function getOnboardingStatus(organizationId: string, role: OrgRole): Promise<OnboardingStatus> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      onboardingManualChosen: true,
      onboardingInviteDeferred: true,
    },
  });

  const [projects, reportCount, memberCount, inviteCount, bindings] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId, isArchived: false },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.report.count({
      where: { project: { organizationId, isArchived: false } },
    }),
    prisma.membership.count({ where: { organizationId } }),
    prisma.organizationInvite.count({
      where: { organizationId, expiresAt: { gt: new Date() } },
    }),
    prisma.projectConnectorBinding.findMany({
      where: { project: { organizationId, isArchived: false }, status: "ACTIVE" },
      select: { type: true, config: true },
    }),
  ]);

  const liveProjects = projects.filter((project) => !isCloudBridgeProject(project.name));
  const hasProject = liveProjects.length > 0;
  const firstProjectId = liveProjects[0]?.id ?? null;
  const hasConnector = bindings.some((binding) => bindingSetupComplete(binding.type, binding.config));
  const hasReport = reportCount > 0;
  const hasTeam = memberCount > 1 || inviteCount > 0;
  const canInvite = can(role, "member.invite");
  const sourceDone = hasConnector || Boolean(organization?.onboardingManualChosen) || hasReport;
  const inviteDone = !canInvite || hasTeam || Boolean(organization?.onboardingInviteDeferred);

  const items: OnboardingItem[] = [
    {
      id: "project",
      label: "Create a project",
      detail: "A workspace needs one real engagement before you can generate.",
      done: hasProject,
    },
    {
      id: "source",
      label: "Connect a tool or enter data manually",
      detail: "Map Jira, Asana, Monday, or Trello — or continue with the form.",
      done: sourceDone,
      href: firstProjectId ? `/projects/${firstProjectId}` : undefined,
    },
    {
      id: "report",
      label: "Generate your first weekly report",
      detail: "This is the aha moment — a real report for your project, not the sample.",
      done: hasReport,
      href: firstProjectId ? `/projects/${firstProjectId}` : undefined,
    },
  ];

  if (canInvite) {
    items.push({
      id: "invite",
      label: "Invite a teammate",
      detail: "Owner and Admin can invite. You can do this after the first report.",
      done: inviteDone,
      href: "/settings?tab=team",
    });
  }

  const ahaComplete = hasReport;
  const blocking = !hasProject;
  const showChecklist = items.some((item) => !item.done);

  return {
    ahaComplete,
    blocking,
    showChecklist,
    firstProjectId,
    canInvite,
    items,
  };
}
