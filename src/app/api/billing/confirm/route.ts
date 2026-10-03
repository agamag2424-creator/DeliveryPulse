import { NextResponse } from "next/server";
import { z } from "zod";

import { applyRazorpaySubscription } from "@/lib/billing/apply-subscription";
import { fetchSubscription, isRazorpayConfigured, verifyCheckoutSignature } from "@/lib/billing/razorpay-client";
import { requireOrgPermission } from "@/lib/org/context";
import { prisma } from "@/lib/prisma";

const confirmSchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_subscription_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  const gated = await requireOrgPermission("billing.manage");
  if ("response" in gated) {
    return gated.response;
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "Razorpay is not configured" }, { status: 503 });
  }

  try {
    const body = confirmSchema.parse(await request.json());
    const organization = await prisma.organization.findUnique({
      where: { id: gated.ctx.organizationId },
      select: { razorpaySubscriptionId: true },
    });
    const subscriptionId = organization?.razorpaySubscriptionId;
    if (!subscriptionId || subscriptionId !== body.razorpay_subscription_id) {
      return NextResponse.json({ error: "Subscription mismatch" }, { status: 400 });
    }

    const valid = verifyCheckoutSignature({
      subscriptionId,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    });
    if (!valid) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const subscription = await fetchSubscription(subscriptionId);
    await applyRazorpaySubscription(gated.ctx.organizationId, subscription);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid confirmation" }, { status: 400 });
    }
    console.error("Billing confirm failed:", error);
    return NextResponse.json({ error: "Failed to confirm subscription" }, { status: 500 });
  }
}
