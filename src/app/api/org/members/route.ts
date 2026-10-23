import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { OrgRole } from "@prisma/client";

import { sendInviteEmail } from "@/lib/email/tokens";
import { getOrgContext, requireOrgPermission } from "@/lib/org/context";
import { can, canChangeMemberRole, canInviteRole } from "@/lib/org/permissions";
import { prisma } from "@/lib/prisma";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET() {
  const gated = await requireOrgPermission("project.view");
  if ("response" in gated) {
    return gated.response;
  }

  const [members, invites] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId: gated.ctx.organizationId },
      include: { user: { select: { id: true, email: true, name: true, image: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.organizationInvite.findMany({
      where: { organizationId: gated.ctx.organizationId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    organization: { id: gated.ctx.organizationId, name: gated.ctx.organizationName },
    role: gated.ctx.role,
    canInvite: can(gated.ctx.role, "member.invite"),
    canManageMembers: gated.ctx.role === "OWNER",
    members: members.map((membership) => ({
      id: membership.id,
      userId: membership.userId,
      role: membership.role,
      email: membership.user.email,
      name: membership.user.name,
      image: membership.user.image,
    })),
    invites: invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
    })),
  });
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export async function POST(request: Request) {
  const gated = await requireOrgPermission("member.invite");
  if ("response" in gated) {
    return gated.response;
  }

  try {
    const body = inviteSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const role = body.role as OrgRole;

    if (!canInviteRole(gated.ctx.role, role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingMember = await prisma.membership.findFirst({
      where: { organizationId: gated.ctx.organizationId, user: { email } },
    });
    if (existingMember) {
      return NextResponse.json({ error: "That person is already a member." }, { status: 409 });
    }

    const token = randomBytes(32).toString("hex");
    const invite = await prisma.organizationInvite.upsert({
      where: { organizationId_email: { organizationId: gated.ctx.organizationId, email } },
      update: {
        role,
        token,
        invitedById: gated.ctx.userId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
      create: {
        organizationId: gated.ctx.organizationId,
        email,
        role,
        token,
        invitedById: gated.ctx.userId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    void sendInviteEmail(email, gated.ctx.organizationName, invite.token).catch(console.error);

    return NextResponse.json({ id: invite.id, email: invite.email, role: invite.role }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
    }
    console.error("Invite failed:", error);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}

const patchSchema = z.object({
  membershipId: z.string().min(1),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export async function PATCH(request: Request) {
  const ctx = await getOrgContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = patchSchema.parse(await request.json());
    const membership = await prisma.membership.findFirst({
      where: { id: body.membershipId, organizationId: ctx.organizationId },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canChangeMemberRole(ctx.role, membership.role, body.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.membership.update({
      where: { id: membership.id },
      data: { role: body.role },
    });
    return NextResponse.json({ id: updated.id, role: updated.role });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

const deleteSchema = z.object({
  membershipId: z.string().optional(),
  inviteId: z.string().optional(),
});

export async function DELETE(request: Request) {
  const gated = await requireOrgPermission("member.invite");
  if ("response" in gated) {
    return gated.response;
  }

  try {
    const body = deleteSchema.parse(await request.json());
    if (body.inviteId) {
      await prisma.organizationInvite.deleteMany({
        where: { id: body.inviteId, organizationId: gated.ctx.organizationId },
      });
      return NextResponse.json({ success: true });
    }

    if (!body.membershipId) {
      return NextResponse.json({ error: "membershipId or inviteId required" }, { status: 400 });
    }

    const membership = await prisma.membership.findFirst({
      where: { id: body.membershipId, organizationId: gated.ctx.organizationId },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (membership.role === "OWNER") {
      return NextResponse.json({ error: "Cannot remove the owner." }, { status: 400 });
    }
    if (membership.userId === gated.ctx.userId) {
      return NextResponse.json({ error: "Leave the organization from account settings." }, { status: 400 });
    }

    await prisma.membership.delete({ where: { id: membership.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update members" }, { status: 500 });
  }
}
