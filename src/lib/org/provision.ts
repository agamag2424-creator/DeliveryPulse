import type { Membership, OrgRole, Organization } from "@prisma/client";

import { defaultOrgName } from "@/lib/org/permissions";
import { prisma } from "@/lib/prisma";

export async function createOrganizationWithOwner(
  userId: string,
  name: string,
): Promise<Organization> {
  return prisma.organization.create({
    data: {
      name,
      memberships: {
        create: { userId, role: "OWNER" },
      },
    },
  });
}

export async function acceptPendingInvitesForEmail(
  userId: string,
  email: string,
): Promise<Organization | null> {
  const now = new Date();
  const invites = await prisma.organizationInvite.findMany({
    where: { email: email.trim().toLowerCase(), expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });

  let firstOrg: Organization | null = null;

  for (const invite of invites) {
    await prisma.$transaction(async (tx) => {
      await tx.membership.upsert({
        where: {
          organizationId_userId: { organizationId: invite.organizationId, userId },
        },
        update: {},
        create: {
          organizationId: invite.organizationId,
          userId,
          role: invite.role,
        },
      });
      await tx.organizationInvite.delete({ where: { id: invite.id } });
    });

    if (!firstOrg) {
      firstOrg = await prisma.organization.findUnique({ where: { id: invite.organizationId } });
    }
  }

  return firstOrg;
}

export async function provisionOrganizationForUser(user: {
  id: string;
  email: string;
  name?: string | null;
}): Promise<{ organization: Organization; role: OrgRole }> {
  const existing = await prisma.membership.findFirst({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    if (user.id && existing.organizationId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { activeOrganizationId: existing.organizationId },
      });
    }
    return { organization: existing.organization, role: existing.role };
  }

  const joined = await acceptPendingInvitesForEmail(user.id, user.email);
  if (joined) {
    const membership = await prisma.membership.findFirstOrThrow({
      where: { userId: user.id, organizationId: joined.id },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { activeOrganizationId: joined.id },
    });
    return { organization: joined, role: membership.role };
  }

  const organization = await createOrganizationWithOwner(
    user.id,
    defaultOrgName(user.name, user.email),
  );
  await prisma.user.update({
    where: { id: user.id },
    data: { activeOrganizationId: organization.id },
  });
  return { organization, role: "OWNER" };
}

export async function getMembership(
  userId: string,
  organizationId: string,
): Promise<(Membership & { organization: Organization }) | null> {
  return prisma.membership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    include: { organization: true },
  });
}

export async function resolveActiveOrganization(userId: string): Promise<{
  organization: Organization;
  role: OrgRole;
} | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, activeOrganizationId: true },
  });
  if (!user) {
    return null;
  }

  if (user.activeOrganizationId) {
    const membership = await getMembership(userId, user.activeOrganizationId);
    if (membership) {
      return { organization: membership.organization, role: membership.role };
    }
  }

  return provisionOrganizationForUser(user);
}
