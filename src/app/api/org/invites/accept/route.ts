import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({ token: z.string().min(1) });

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());
    const invite = await prisma.organizationInvite.findUnique({
      where: { token: body.token },
      include: { organization: true },
    });

    if (!invite || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invite is invalid or expired." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email || user.email.trim().toLowerCase() !== invite.email) {
      return NextResponse.json(
        { error: `Sign in as ${invite.email} to accept this invite.` },
        { status: 403 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.membership.upsert({
        where: {
          organizationId_userId: { organizationId: invite.organizationId, userId },
        },
        update: { role: invite.role },
        create: {
          organizationId: invite.organizationId,
          userId,
          role: invite.role,
        },
      });
      await tx.organizationInvite.delete({ where: { id: invite.id } });
      await tx.user.update({
        where: { id: userId },
        data: { activeOrganizationId: invite.organizationId },
      });
    });

    return NextResponse.json({
      organizationId: invite.organizationId,
      organizationName: invite.organization.name,
      role: invite.role,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Accept invite failed:", error);
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }
}
