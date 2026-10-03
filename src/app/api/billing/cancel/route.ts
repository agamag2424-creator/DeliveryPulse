import { NextResponse } from "next/server";

import { applyRazorpaySubscription } from "@/lib/billing/apply-subscription";
import { cancelSubscriptionAtCycleEnd, isRazorpayConfigured } from "@/lib/billing/razorpay-client";
import { requireOrgPermission } from "@/lib/org/context";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const gated = await requireOrgPermission("billing.manage");
  if ("response" in gated) {
    return gated.response;
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "Razorpay is not configured" }, { status: 503 });
  }

  const organization = await prisma.organization.findUnique({
    where: { id: gated.ctx.organizationId },
    select: { razorpaySubscriptionId: true, billingPlan: true },
  });
  if (!organization?.razorpaySubscriptionId || organization.billingPlan !== "PRO") {
    return NextResponse.json({ error: "No active subscription to cancel." }, { status: 409 });
  }

  try {
    const subscription = await cancelSubscriptionAtCycleEnd(organization.razorpaySubscriptionId);
    await applyRazorpaySubscription(gated.ctx.organizationId, subscription, { cancelAtPeriodEnd: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Billing cancel failed:", error);
    const message = error instanceof Error ? error.message : "Failed to cancel subscription";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
