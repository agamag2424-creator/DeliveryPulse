import { NextResponse } from "next/server";

import { applyRazorpaySubscription } from "@/lib/billing/apply-subscription";
import { CHECKOUT_NAME, PRO_PLAN_DESCRIPTION } from "@/lib/billing/plan";
import {
  createProSubscription,
  ensureCustomer,
  ensureProPlanId,
  getRazorpayKeyId,
  isRazorpayConfigured,
} from "@/lib/billing/razorpay-client";
import { hasPaidAccess } from "@/lib/billing/subscription-state";
import { requireOrgPermission } from "@/lib/org/context";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const gated = await requireOrgPermission("billing.manage");
  if ("response" in gated) {
    return gated.response;
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
      { status: 503 },
    );
  }

  const organization = await prisma.organization.findUnique({
    where: { id: gated.ctx.organizationId },
    include: {
      memberships: {
        where: { role: "OWNER" },
        include: { user: { select: { email: true, name: true } } },
        take: 1,
      },
    },
  });
  if (!organization) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (hasPaidAccess(organization)) {
    return NextResponse.json({ error: "This workspace already has an active plan." }, { status: 409 });
  }

  const owner = organization.memberships[0]?.user;
  const actor = await prisma.user.findUnique({
    where: { id: gated.ctx.userId },
    select: { email: true, name: true },
  });
  const email = actor?.email ?? owner?.email;
  const name = actor?.name ?? owner?.name ?? organization.name;
  if (!email) {
    return NextResponse.json({ error: "Owner email is required to start checkout." }, { status: 400 });
  }

  try {
    const planId = await ensureProPlanId();
    const customerId = await ensureCustomer({
      existingId: organization.razorpayCustomerId,
      name,
      email,
      organizationId: organization.id,
    });
    const subscription = await createProSubscription({
      planId,
      customerId,
      organizationId: organization.id,
    });

    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        razorpayCustomerId: customerId,
        razorpaySubscriptionId: subscription.id,
      },
    });
    await applyRazorpaySubscription(organization.id, subscription);

    return NextResponse.json({
      keyId: getRazorpayKeyId(),
      subscriptionId: subscription.id,
      name: CHECKOUT_NAME,
      description: PRO_PLAN_DESCRIPTION,
      prefill: { name, email },
    });
  } catch (error) {
    console.error("Billing checkout failed:", error);
    const message = error instanceof Error ? error.message : "Failed to start checkout";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
