import type { BillingPlan, SubscriptionStatus } from "@prisma/client";

import type { RazorpaySubscription } from "@/lib/billing/razorpay-client";
import { isRazorpaySubscriptionStatus } from "@/lib/billing/razorpay-client";

export type OrgBillingState = {
  billingPlan: BillingPlan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  lastPaymentError: string | null;
};

export function hasPaidAccess(state: { billingPlan: BillingPlan; subscriptionStatus: SubscriptionStatus }): boolean {
  if (state.billingPlan !== "PRO") {
    return false;
  }
  switch (state.subscriptionStatus) {
    case "TRIALING":
    case "ACTIVE":
    case "PAST_DUE":
    case "CANCEL_SCHEDULED":
      return true;
    case "NONE":
    case "HALTED":
    case "CANCELLED":
      return false;
    default: {
      const exhaustive: never = state.subscriptionStatus;
      return exhaustive;
    }
  }
}

function fromUnix(seconds: number | null | undefined): Date | null {
  if (!seconds) {
    return null;
  }
  return new Date(seconds * 1000);
}

export function billingStateFromRazorpay(
  subscription: RazorpaySubscription,
  options: { cancelAtPeriodEnd?: boolean; lastPaymentError?: string | null } = {},
): OrgBillingState {
  const status = isRazorpaySubscriptionStatus(subscription.status) ? subscription.status : "created";
  const now = Date.now();
  const startAt = fromUnix(subscription.start_at);
  const periodEnd = fromUnix(subscription.current_end ?? subscription.charge_at);
  const trialEndsAt = startAt && startAt.getTime() > now ? startAt : null;
  const cancelAtPeriodEnd = options.cancelAtPeriodEnd ?? false;

  switch (status) {
    case "created":
      return {
        billingPlan: "FREE",
        subscriptionStatus: "NONE",
        trialEndsAt,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        lastPaymentError: null,
      };
    case "authenticated":
    case "active":
      return {
        billingPlan: "PRO",
        subscriptionStatus: trialEndsAt ? "TRIALING" : cancelAtPeriodEnd ? "CANCEL_SCHEDULED" : "ACTIVE",
        trialEndsAt,
        currentPeriodEnd: periodEnd ?? trialEndsAt,
        cancelAtPeriodEnd,
        lastPaymentError: null,
      };
    case "pending":
    case "paused":
      return {
        billingPlan: "PRO",
        subscriptionStatus: "PAST_DUE",
        trialEndsAt,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd,
        lastPaymentError: options.lastPaymentError ?? "Renewal failed. Razorpay will retry the charge.",
      };
    case "halted":
      return {
        billingPlan: "FREE",
        subscriptionStatus: "HALTED",
        trialEndsAt: null,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        lastPaymentError: options.lastPaymentError ?? "Subscription halted after failed renewals. Workspace is on Free.",
      };
    case "cancelled":
    case "completed":
    case "expired":
      return {
        billingPlan: "FREE",
        subscriptionStatus: "CANCELLED",
        trialEndsAt: null,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        lastPaymentError: null,
      };
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}
