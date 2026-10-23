import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: {
      organization: { include: { memberships: true } },
    },
  });

  for (const membership of memberships) {
    const others = membership.organization.memberships.filter((item) => item.userId !== userId);
    if (membership.role === "OWNER" && others.length > 0) {
      return NextResponse.json(
        { error: "Transfer ownership before deleting your account. Other members remain in this workspace." },
        { status: 409 },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const membership of memberships) {
      const others = membership.organization.memberships.filter((item) => item.userId !== userId);
      if (others.length === 0) {
        await tx.organization.delete({ where: { id: membership.organizationId } });
      }
    }
    await tx.user.delete({ where: { id: userId } });
  });

  return NextResponse.json({ success: true });
}
