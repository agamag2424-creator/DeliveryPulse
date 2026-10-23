import type { OrgRole } from "@prisma/client";

export type OrgPermission =
  | "project.view"
  | "project.create"
  | "project.update"
  | "project.archive"
  | "report.generate"
  | "connector.map"
  | "member.invite"
  | "member.manage"
  | "integration.manage"
  | "billing.manage"
  | "org.delete";

const MEMBER_PERMISSIONS: OrgPermission[] = [
  "project.view",
  "project.create",
  "project.update",
  "report.generate",
  "connector.map",
];

const ADMIN_PERMISSIONS: OrgPermission[] = [
  ...MEMBER_PERMISSIONS,
  "project.archive",
  "member.invite",
  "member.manage",
  "integration.manage",
];

const OWNER_PERMISSIONS: OrgPermission[] = [
  ...ADMIN_PERMISSIONS,
  "billing.manage",
  "org.delete",
];

function permissionsForRole(role: OrgRole): readonly OrgPermission[] {
  switch (role) {
    case "OWNER":
      return OWNER_PERMISSIONS;
    case "ADMIN":
      return ADMIN_PERMISSIONS;
    case "MEMBER":
      return MEMBER_PERMISSIONS;
    default: {
      const exhaustive: never = role;
      return exhaustive;
    }
  }
}

export function can(role: OrgRole, permission: OrgPermission): boolean {
  return permissionsForRole(role).includes(permission);
}

export function canInviteRole(actor: OrgRole, invited: OrgRole): boolean {
  if (!can(actor, "member.invite")) {
    return false;
  }
  if (invited === "OWNER") {
    return false;
  }
  if (actor === "OWNER") {
    return invited === "ADMIN" || invited === "MEMBER";
  }
  if (actor === "ADMIN") {
    return invited === "MEMBER";
  }
  return false;
}

export function canChangeMemberRole(actor: OrgRole, targetCurrent: OrgRole, next: OrgRole): boolean {
  if (actor !== "OWNER") {
    return false;
  }
  if (targetCurrent === "OWNER" || next === "OWNER") {
    return false;
  }
  return next === "ADMIN" || next === "MEMBER";
}

export function defaultOrgName(userName: string | null | undefined, email: string): string {
  const label = userName?.trim() || email.split("@")[0] || "Workspace";
  return `${label}'s workspace`;
}
