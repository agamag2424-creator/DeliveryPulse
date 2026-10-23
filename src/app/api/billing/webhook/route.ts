import { NextResponse } from "next/server";

import { applyRazorpaySubscription, findOrganizationForSubscription } from "@/lib/billing/apply-subscription";
import { isRazorpayConfigured, verifyWebhookSignature } from "@/lib/billing/razorpay-client";
import type { RazorpaySubscription } from "@/lib/billing/razorpay-client";
import { prisma } from "@/lib/prisma";

type WebhookEventName =
  | "subscription.authenticated"
  | "subscription.activated"
  | "subscription.charged"
  | "subscription.pending"
  | "subscription.halted"
  | "subscription.cancelled"
  | "subscription.completed"
  | "subscription.updated"
  | "subscription.paused"
  | "subscription.resumed"
  | "payment.failed";

type WebhookPayload = {
  event?: string;
  payload?: {
    subscription?: { entity?: RazorpaySubscription };
    payment?: { entity?: { error_description?: string; error_reason?: string } };
  };
};

function isWebhookEventName(value: string): value is WebhookEventName {
  switch (value) {
    case "subscription.authenticated":
    case "subscription.activated":
    case "subscription.charged":
    case "subscription.pending":
    case "subscription.halted":
    case "subscription.cancelled":
    case "subscription.completed":
    case "subscription.updated":
    case "subscription.paused":
    case "subscription.resumed":
    case "payment.failed":
      return true;
    default:
      return false;
  }
}

export async function POST(request: Request) {
  if (!isRazorpayConfigured() || !process.env.RAZORPAY_WEBHOOK_SECRET?.trim()) {
    return NextResponse.json({ error: "Webhooks are not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventId = request.headers.get("x-razorpay-event-id");
  if (eventId) {
    const duplicate = await prisma.billingWebhookEvent.findUnique({ where: { id: eventId } });
    if (duplicate) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
  }

  let parsed: WebhookPayload;
  try {
    parsed = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = parsed.event ?? "";
  if (!isWebhookEventName(eventName)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const subscription = parsed.payload?.subscription?.entity;
  const paymentError =
    parsed.payload?.payment?.entity?.error_description ?? parsed.payload?.payment?.entity?.error_reason ?? null;

  if (!subscription?.id) {
    if (eventId) {
      await prisma.billingWebhookEvent.create({ data: { id: eventId, eventType: eventName } });
    }
    return NextResponse.json({ ok: true, ignored: true });
  }

  const organizationId = await findOrganizationForSubscription(subscription);
  if (organizationId) {
    await applyEvent(eventName, organizationId, subscription, paymentError);
  }

  if (eventId) {
    await prisma.billingWebhookEvent.create({ data: { id: eventId, eventType: eventName } });
  }

  return NextResponse.json({ ok: true });
}

async function applyEvent(
  eventName: WebhookEventName,
  organizationId: string,
  subscription: RazorpaySubscription,
  paymentError: string | null,
): Promise<void> {
  switch (eventName) {
    case "subscription.authenticated":
    case "subscription.activated":
    case "subscription.charged":
    case "subscription.updated":
    case "subscription.resumed":
      await applyRazorpaySubscription(organizationId, subscription);
      return;
    case "subscription.pending":
    case "subscription.paused":
    case "payment.failed":
      await applyRazorpaySubscription(organizationId, subscription, {
        lastPaymentError: paymentError ?? "Payment failed. Razorpay will retry.",
      });
      return;
    case "subscription.halted":
      await applyRazorpaySubscription(organizationId, subscription, {
        lastPaymentError: paymentError ?? "Subscription halted after failed renewals.",
      });
      return;
    case "subscription.cancelled":
    case "subscription.completed":
      await applyRazorpaySubscription(organizationId, subscription);
      return;
    default: {
      const exhaustive: never = eventName;
      return exhaustive;
    }
  }
}
