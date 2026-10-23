import { NextResponse } from "next/server";

import { CHECKOUT_NAME, PRO_AMOUNT_SUBUNITS, PRO_CURRENCY, PRO_PLAN_NAME, TRIAL_DAYS } from "@/lib/billing/plan";
import { isRazorpayConfigured } from "@/lib/billing/razorpay-client";
import { hasPaidAccess } from "@/lib/billing/subscription-state";
import { can } from "@/lib/org/permissions";
import { requireOrgPermission } from "@/lib/org/context";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const gated = await requireOrgPermission("project.view");
  if ("response" in gated) {
    return gated.response;
  }

  const organization = await prisma.organization.findUnique({
    where: { id: gated.ctx.organizationId },
  });
  if (!organization) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    configured: isRazorpayConfigured(),
    canManage: can(gated.ctx.role, "billing.manage"),
    planName: PRO_PLAN_NAME,
    amountSubunits: PRO_AMOUNT_SUBUNITS,
    currency: PRO_CURRENCY,
    trialDays: TRIAL_DAYS,
    checkoutName: CHECKOUT_NAME,
    billing: {
      plan: organization.billingPlan,
      status: organization.subscriptionStatus,
      hasPaidAccess: hasPaidAccess({
        billingPlan: organization.billingPlan,
        subscriptionStatus: organization.subscriptionStatus,
      }),
      trialEndsAt: organization.trialEndsAt?.toISOString() ?? null,
      currentPeriodEnd: organization.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: organization.cancelAtPeriodEnd,
      lastPaymentError: organization.lastPaymentError,
    },
  });
}
