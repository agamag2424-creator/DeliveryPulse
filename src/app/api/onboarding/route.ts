import { NextResponse } from "next/server";
import { z } from "zod";

import { getOnboardingStatus } from "@/lib/onboarding/status";
import { getOrgContext, requireOrgPermission } from "@/lib/org/context";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const gated = await requireOrgPermission("project.view");
  if ("response" in gated) {
    return gated.response;
  }

  const status = await getOnboardingStatus(gated.ctx.organizationId, gated.ctx.role);
  return NextResponse.json(status);
}

const patchSchema = z.object({
  action: z.enum(["choose_manual", "defer_invite"]),
});

export async function PATCH(request: Request) {
  const ctx = await getOrgContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = patchSchema.parse(await request.json());
    switch (body.action) {
      case "choose_manual":
        await prisma.organization.update({
          where: { id: ctx.organizationId },
          data: { onboardingManualChosen: true },
        });
        break;
      case "defer_invite":
        await prisma.organization.update({
          where: { id: ctx.organizationId },
          data: { onboardingInviteDeferred: true },
        });
        break;
      default: {
        const exhaustive: never = body.action;
        return exhaustive;
      }
    }

    const status = await getOnboardingStatus(ctx.organizationId, ctx.role);
    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update onboarding" }, { status: 500 });
  }
}
