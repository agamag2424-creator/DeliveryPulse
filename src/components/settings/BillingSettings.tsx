"use client";

import { useEffect, useState } from "react";

type BillingPayload = {
  configured: boolean;
  canManage: boolean;
  planName: string;
  amountSubunits: number;
  currency: string;
  trialDays: number;
  checkoutName: string;
  billing: {
    plan: string;
    status: string;
    hasPaidAccess: boolean;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    lastPaymentError: string | null;
  };
};

type CheckoutSession = {
  keyId: string;
  subscriptionId: string;
  name: string;
  description: string;
  prefill: { name: string; email: string };
  error?: string;
};

type RazorpayCheckout = {
  open: () => void;
};

type UsagePayload = {
  hasPaidAccess: boolean;
  used: number;
  limit: number;
  remaining: number | null;
};

type RazorpayConstructor = new (options: {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_subscription_id: string;
    razorpay_signature: string;
  }) => void;
}) => RazorpayCheckout;

function formatMoney(amountSubunits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountSubunits / 100);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleDateString();
}

function loadCheckoutScript(): Promise<RazorpayConstructor> {
  const existing = window as Window & { Razorpay?: RazorpayConstructor };
  if (existing.Razorpay) {
    return Promise.resolve(existing.Razorpay);
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      const ctor = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;
      if (!ctor) {
        reject(new Error("Razorpay Checkout failed to load"));
        return;
      }
      resolve(ctor);
    };
    script.onerror = () => reject(new Error("Razorpay Checkout failed to load"));
    document.body.appendChild(script);
  });
}

export function BillingSettings() {
  const [payload, setPayload] = useState<BillingPayload | null>(null);
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reload() {
    void fetch("/api/billing")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: BillingPayload | null) => {
        if (data) {
          setPayload(data);
        }
      });
    void fetch("/api/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: UsagePayload | null) => {
        if (data) {
          setUsage(data);
        }
      });
  }

  useEffect(() => {
    reload();
  }, []);

  async function startCheckout() {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST" });
      const body = (await response.json()) as CheckoutSession;
      if (!response.ok) {
        setError(body.error ?? "Failed to start checkout");
        return;
      }

      const Razorpay = await loadCheckoutScript();
      const checkout = new Razorpay({
        key: body.keyId,
        subscription_id: body.subscriptionId,
        name: body.name,
        description: body.description,
        prefill: body.prefill,
        theme: { color: "#2563eb" },
        handler: (checkoutResponse) => {
          void fetch("/api/billing/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(checkoutResponse),
          }).then(async (confirmResponse) => {
            const confirmBody = (await confirmResponse.json()) as { error?: string };
            if (!confirmResponse.ok) {
              setError(confirmBody.error ?? "Payment could not be verified");
              return;
            }
            setMessage("Pro is active. Trial starts now.");
            reload();
          });
        },
      });
      checkout.open();
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  async function cancelPlan() {
    setError(null);
    setMessage(null);
    setBusy(true);
    const response = await fetch("/api/billing/cancel", { method: "POST" });
    const body = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(body.error ?? "Failed to cancel");
      return;
    }
    setMessage("Cancellation scheduled at the end of the current period.");
    reload();
  }

  if (!payload) {
    return (
      <section className="rounded-panel border border-border bg-background-card p-6">
        <p className="text-sm text-text-muted">Loading billing…</p>
      </section>
    );
  }

  const { billing, canManage, configured } = payload;

  return (
    <section className="rounded-panel border border-border bg-background-card p-6">
      <h2 className="text-lg font-semibold text-text-primary">Billing</h2>
      <p className="mt-1 text-sm text-text-muted">
        Workspace subscription. This is not consulting milestone billing on reports.
      </p>
      {message ? <p className="mt-2 text-sm text-rag-green">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-rag-red">{error}</p> : null}
      {billing.lastPaymentError ? <p className="mt-2 text-sm text-rag-amber">{billing.lastPaymentError}</p> : null}

      <dl className="mt-4 grid gap-2 text-sm text-text-primary">
        <div className="flex justify-between gap-4">
          <dt className="text-text-muted">Plan</dt>
          <dd>{billing.plan === "PRO" ? payload.planName : "Free"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-muted">Status</dt>
          <dd>{billing.status.toLowerCase().replaceAll("_", " ")}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-muted">Price</dt>
          <dd>
            {formatMoney(payload.amountSubunits, payload.currency)} / month · {payload.trialDays}-day trial
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-muted">Trial ends</dt>
          <dd>{formatDate(billing.trialEndsAt)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-muted">Current period ends</dt>
          <dd>{formatDate(billing.currentPeriodEnd)}</dd>
        </div>
        {!billing.hasPaidAccess && usage ? (
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Reports this month</dt>
            <dd>
              {usage.used} / {usage.limit}
            </dd>
          </div>
        ) : null}
      </dl>

      {!canManage ? (
        <p className="mt-4 text-sm text-text-muted">Only the workspace owner can manage billing.</p>
      ) : !configured ? (
        <p className="mt-4 text-sm text-rag-amber">
          Add RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET to .env.local. Enable International
          Payments on the Razorpay dashboard so US/UK cards can pay in USD.
        </p>
      ) : billing.hasPaidAccess ? (
        <div className="mt-6 space-y-2">
          {billing.cancelAtPeriodEnd ? (
            <p className="text-sm text-text-muted">Cancels at period end. You keep Pro until then.</p>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void cancelPlan()}
              className="rounded-[3px] border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-faint disabled:opacity-60"
            >
              Cancel at period end
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void startCheckout()}
          className="mt-6 rounded-[3px] bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-black disabled:opacity-60"
        >
          {busy ? "Starting…" : `Upgrade to ${payload.planName}`}
        </button>
      )}
    </section>
  );
}
