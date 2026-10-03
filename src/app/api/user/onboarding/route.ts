import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function PATCH() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { onboardingDismissed: true },
  });

  return NextResponse.json({ success: true });
}
