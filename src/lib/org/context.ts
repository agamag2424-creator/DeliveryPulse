import { NextResponse } from "next/server";
import type { OrgRole } from "@prisma/client";

import { getSessionUserId } from "@/lib/auth/session";
import { can, type OrgPermission } from "@/lib/org/permissions";
import { resolveActiveOrganization } from "@/lib/org/provision";

export type OrgContext = {
  userId: string;
  organizationId: string;
  role: OrgRole;
  organizationName: string;
};

export async function getOrgContext(): Promise<OrgContext | null> {
  const userId = await getSessionUserId();
  if (!userId) {
    return null;
  }

  const resolved = await resolveActiveOrganization(userId);
  if (!resolved) {
    return null;
  }

  return {
    userId,
    organizationId: resolved.organization.id,
    role: resolved.role,
    organizationName: resolved.organization.name,
  };
}

export async function requireOrgPermission(
  permission: OrgPermission,
): Promise<{ ctx: OrgContext } | { response: NextResponse }> {
  const ctx = await getOrgContext();
  if (!ctx) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!can(ctx.role, permission)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ctx };
}
