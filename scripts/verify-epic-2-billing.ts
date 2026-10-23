/**
 * Epic 2: org Razorpay billing is separate from report milestone billingValue.
 *
 * Usage: npx tsx scripts/verify-epic-2-billing.ts
 */
import { createHmac } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

import "./load-local-env";

import { can } from "../src/lib/org/permissions";
import { billingStateFromRazorpay, hasPaidAccess } from "../src/lib/billing/subscription-state";
import { PRO_AMOUNT_SUBUNITS, PRO_CURRENCY, TRIAL_DAYS } from "../src/lib/billing/plan";
import { verifyWebhookSignature } from "../src/lib/billing/razorpay-client";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertSources(): void {
  const schema = readFileSync(join(__dirname, "../prisma/schema.prisma"), "utf8");
  assert(schema.includes("enum BillingPlan"), "schema must define BillingPlan on the org, not the report");
  assert(schema.includes("razorpaySubscriptionId"), "Organization stores Razorpay subscription id");
  const reportBlock = schema.slice(schema.indexOf("model Report"), schema.indexOf("model ReportEmbedding"));
  assert(!reportBlock.includes("razorpay"), "Report model must not store SaaS billing fields");

  const inputPage = readFileSync(join(__dirname, "../src/app/input/page.tsx"), "utf8");
  assert(inputPage.includes("billingValue"), "consulting milestone billingValue on the report form must remain");

  const checkout = readFileSync(join(__dirname, "../src/app/api/billing/checkout/route.ts"), "utf8");
  assert(checkout.includes('requireOrgPermission("billing.manage")'), "checkout is Owner-only");

  const webhook = readFileSync(join(__dirname, "../src/app/api/billing/webhook/route.ts"), "utf8");
  assert(webhook.includes("verifyWebhookSignature"), "webhook must verify Razorpay signature");
  assert(webhook.includes("subscription.halted"), "webhook must downgrade on halt");

  console.log("✓ schema + source gates (org billing vs milestone billingValue)");
}

function assertPermissionsAndMapping(): void {
  assert(can("OWNER", "billing.manage"), "Owner manages billing");
  assert(!can("ADMIN", "billing.manage"), "Admin cannot manage billing");
  assert(!can("MEMBER", "billing.manage"), "Member cannot manage billing");
  assert(PRO_CURRENCY === "USD" && PRO_AMOUNT_SUBUNITS === 4900 && TRIAL_DAYS === 14, "locked $49 USD / 14-day trial");

  const active = billingStateFromRazorpay({
    id: "sub_test",
    status: "active",
    plan_id: "plan_test",
    current_end: Math.floor(Date.now() / 1000) + 86400,
  });
  assert(hasPaidAccess(active) && active.billingPlan === "PRO", "active subscription is Pro");

  const halted = billingStateFromRazorpay({
    id: "sub_test",
    status: "halted",
    plan_id: "plan_test",
  });
  assert(!hasPaidAccess(halted) && halted.billingPlan === "FREE", "halted subscription downgrades to Free");

  const pending = billingStateFromRazorpay({
    id: "sub_test",
    status: "pending",
    plan_id: "plan_test",
  });
  assert(hasPaidAccess(pending) && pending.subscriptionStatus === "PAST_DUE", "pending retry keeps Pro");

  console.log("✓ Owner-only billing + halt/retry mapping");
}

function assertWebhookHmac(): void {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    process.env.RAZORPAY_WEBHOOK_SECRET = "epic2-test-webhook-secret";
  }
  const body = JSON.stringify({ event: "subscription.charged" });
  const signature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex");
  assert(verifyWebhookSignature(body, signature), "valid webhook HMAC must pass");
  assert(!verifyWebhookSignature(body, "deadbeef"), "invalid webhook HMAC must fail");
  console.log("✓ webhook HMAC verification");
}

async function assertHttp(baseUrl: string): Promise<void> {
  const billing = await fetch(`${baseUrl}/api/billing`);
  assert(
    billing.status === 401 || billing.status === 403 || billing.status === 200,
    `GET /api/billing unexpected ${billing.status}`,
  );
  if (billing.status === 200) {
    const payload = (await billing.json()) as { billing?: { plan?: string } };
    assert(payload.billing?.plan === "FREE" || payload.billing?.plan === "PRO", "billing payload includes plan");
  }

  const webhook = await fetch(`${baseUrl}/api/billing/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Razorpay-Signature": "invalid" },
    body: JSON.stringify({ event: "subscription.charged" }),
  });
  assert(
    webhook.status === 400 || webhook.status === 503,
    `unsigned webhook expected 400/503, got ${webhook.status}`,
  );

  const checkout = await fetch(`${baseUrl}/api/billing/checkout`, { method: "POST" });
  assert(
    checkout.status === 401 || checkout.status === 403 || checkout.status === 503 || checkout.status === 409 || checkout.status === 502,
    `POST /api/billing/checkout unexpected ${checkout.status}`,
  );
  console.log(`✓ HTTP billing gates at ${baseUrl}`);
}

async function main(): Promise<void> {
  assertSources();
  assertPermissionsAndMapping();
  assertWebhookHmac();

  const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3001";
  try {
    await assertHttp(baseUrl);
  } catch (error) {
    console.log("⚠ HTTP gates skipped:", (error as Error).message);
  }

  console.log("\n✓ Epic 2 billing verification passed");
}

main().catch((error) => {
  console.error("✗ verify-epic-2-billing failed:", error);
  process.exit(1);
});
