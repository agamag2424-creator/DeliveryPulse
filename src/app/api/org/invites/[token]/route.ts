import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const invite = await prisma.organizationInvite.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } },
  });

  if (!invite || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite is invalid or expired." }, { status: 404 });
  }

  return NextResponse.json({
    organizationName: invite.organization.name,
    email: invite.email,
    role: invite.role,
  });
}
