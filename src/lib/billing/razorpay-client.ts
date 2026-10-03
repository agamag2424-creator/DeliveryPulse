import { createHmac, timingSafeEqual } from "crypto";

import {
  PRO_AMOUNT_SUBUNITS,
  PRO_CURRENCY,
  PRO_INTERVAL,
  PRO_PERIOD,
  PRO_PLAN_DESCRIPTION,
  PRO_PLAN_NAME,
  SUBSCRIPTION_TOTAL_COUNT,
  TRIAL_DAYS,
} from "@/lib/billing/plan";

const RAZORPAY_API = "https://api.razorpay.com/v1";

export type RazorpaySubscriptionStatus =
  | "created"
  | "authenticated"
  | "active"
  | "pending"
  | "halted"
  | "cancelled"
  | "completed"
  | "expired"
  | "paused";

export type RazorpaySubscription = {
  id: string;
  status: string;
  plan_id: string;
  customer_id?: string | null;
  current_start?: number | null;
  current_end?: number | null;
  start_at?: number | null;
  charge_at?: number | null;
  ended_at?: number | null;
  notes?: Record<string, string> | null;
};

type RazorpayErrorBody = {
  error?: { description?: string; code?: string };
};

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
}

export function getRazorpayKeyId(): string {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  if (!keyId) {
    throw new Error("RAZORPAY_KEY_ID is not set");
  }
  return keyId;
}

function getKeySecret(): string {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) {
    throw new Error("RAZORPAY_KEY_SECRET is not set");
  }
  return secret;
}

function getWebhookSecret(): string {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not set");
  }
  return secret;
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${getRazorpayKeyId()}:${getKeySecret()}`).toString("base64")}`;
}

async function razorpayRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${RAZORPAY_API}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = (await response.json()) as T & RazorpayErrorBody;
  if (!response.ok) {
    const message = payload.error?.description ?? `Razorpay ${method} ${path} failed (${response.status})`;
    throw new Error(message);
  }
  return payload;
}

function unixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export async function ensureProPlanId(): Promise<string> {
  const fromEnv = process.env.RAZORPAY_PLAN_ID?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const listed = await razorpayRequest<{ items: Array<{ id: string; item?: { name?: string; amount?: number; currency?: string }; period?: string }> }>(
    "GET",
    "/plans?count=100",
  );

  const existing = listed.items.find(
    (plan) =>
      plan.item?.name === PRO_PLAN_NAME &&
      plan.item?.amount === PRO_AMOUNT_SUBUNITS &&
      plan.item?.currency === PRO_CURRENCY &&
      plan.period === PRO_PERIOD,
  );
  if (existing) {
    return existing.id;
  }

  const created = await razorpayRequest<{ id: string }>("POST", "/plans", {
    period: PRO_PERIOD,
    interval: PRO_INTERVAL,
    item: {
      name: PRO_PLAN_NAME,
      amount: PRO_AMOUNT_SUBUNITS,
      currency: PRO_CURRENCY,
      description: PRO_PLAN_DESCRIPTION,
    },
    notes: { product: "deliverypulse" },
  });
  return created.id;
}

export async function ensureCustomer(params: {
  existingId: string | null;
  name: string;
  email: string;
  organizationId: string;
}): Promise<string> {
  if (params.existingId) {
    return params.existingId;
  }

  const created = await razorpayRequest<{ id: string }>("POST", "/customers", {
    name: params.name,
    email: params.email,
    fail_existing: "0",
    notes: { organizationId: params.organizationId },
  });
  return created.id;
}

export async function createProSubscription(params: {
  planId: string;
  customerId: string;
  organizationId: string;
}): Promise<RazorpaySubscription> {
  const now = Date.now();
  const startAt = unixSeconds(new Date(now + TRIAL_DAYS * 24 * 60 * 60 * 1000));
  const expireBy = unixSeconds(new Date(now + 7 * 24 * 60 * 60 * 1000));

  return razorpayRequest<RazorpaySubscription>("POST", "/subscriptions", {
    plan_id: params.planId,
    customer_id: params.customerId,
    total_count: SUBSCRIPTION_TOTAL_COUNT,
    quantity: 1,
    customer_notify: 1,
    start_at: startAt,
    expire_by: expireBy,
    notes: { organizationId: params.organizationId },
  });
}

export async function cancelSubscriptionAtCycleEnd(subscriptionId: string): Promise<RazorpaySubscription> {
  return razorpayRequest<RazorpaySubscription>("POST", `/subscriptions/${subscriptionId}/cancel`, {
    cancel_at_cycle_end: 1,
  });
}

export async function fetchSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
  return razorpayRequest<RazorpaySubscription>("GET", `/subscriptions/${subscriptionId}`);
}

export function verifyCheckoutSignature(params: {
  subscriptionId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const expected = createHmac("sha256", getKeySecret())
    .update(`${params.paymentId}|${params.subscriptionId}`)
    .digest("hex");
  return safeEqualHex(expected, params.signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = createHmac("sha256", getWebhookSecret()).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

function safeEqualHex(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function isRazorpaySubscriptionStatus(value: string): value is RazorpaySubscriptionStatus {
  switch (value) {
    case "created":
    case "authenticated":
    case "active":
    case "pending":
    case "halted":
    case "cancelled":
    case "completed":
    case "expired":
    case "paused":
      return true;
    default:
      return false;
  }
}
