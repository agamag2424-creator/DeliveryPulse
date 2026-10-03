import { prisma } from "@/lib/prisma";
import type { RazorpaySubscription } from "@/lib/billing/razorpay-client";
import { billingStateFromRazorpay } from "@/lib/billing/subscription-state";

export async function applyRazorpaySubscription(
  organizationId: string,
  subscription: RazorpaySubscription,
  options: { cancelAtPeriodEnd?: boolean; lastPaymentError?: string | null } = {},
): Promise<void> {
  const state = billingStateFromRazorpay(subscription, options);
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      billingPlan: state.billingPlan,
      subscriptionStatus: state.subscriptionStatus,
      trialEndsAt: state.trialEndsAt,
      currentPeriodEnd: state.currentPeriodEnd,
      cancelAtPeriodEnd: state.cancelAtPeriodEnd,
      razorpaySubscriptionId: subscription.id,
      razorpayCustomerId: subscription.customer_id ?? undefined,
      lastPaymentError: state.lastPaymentError,
    },
  });
}

export async function findOrganizationForSubscription(subscription: RazorpaySubscription): Promise<string | null> {
  const fromNotes = subscription.notes?.organizationId;
  if (fromNotes) {
    const org = await prisma.organization.findUnique({ where: { id: fromNotes }, select: { id: true } });
    if (org) {
      return org.id;
    }
  }

  const bySub = await prisma.organization.findFirst({
    where: { razorpaySubscriptionId: subscription.id },
    select: { id: true },
  });
  return bySub?.id ?? null;
}
