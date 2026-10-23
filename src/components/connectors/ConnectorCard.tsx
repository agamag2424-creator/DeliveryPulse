"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ConnectorSetupWizard } from "@/components/connectors/ConnectorSetupWizard";
import { CONNECTOR_CATALOG } from "@/lib/connectors/catalog-meta";
import type { ConnectorType } from "@/lib/connectors/types";
import { connectorTypeToSlug } from "@/lib/connectors/types";

interface ConnectorCardProps {
  type: Exclude<ConnectorType, "JIRA">;
  projectId: string;
  projectName: string;
  autoOpenWizard?: boolean;
}

interface ConnectorStatusResponse {
  connected: boolean;
  status: string | null;
  setupComplete: boolean;
  mappedName: string | null;
  lastSyncError?: string | null;
  oauthConfigured?: boolean;
}

export function ConnectorCard({ type, projectId, projectName, autoOpenWizard = false }: ConnectorCardProps) {
  const catalog = CONNECTOR_CATALOG[type];
  const slug = connectorTypeToSlug(type);
  const [status, setStatus] = useState<ConnectorStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(autoOpenWizard);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/connectors/${slug}/status?projectId=${projectId}`);
      const payload = (await response.json()) as ConnectorStatusResponse;
      if (response.ok) {
        setStatus(payload);
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId, slug]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (autoOpenWizard) {
      setWizardOpen(true);
    }
  }, [autoOpenWizard]);

  const isActive = status?.connected && status.setupComplete && status.status === "ACTIVE";
  const isDisconnected = status?.status === "DISCONNECTED";
  const isPending = status?.connected && !status.setupComplete && !isDisconnected;

  return (
    <>
      <section className="rounded-panel border border-border bg-background-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-text-primary">{catalog.label}</h3>
            <p className="mt-1 text-sm text-text-secondary">{catalog.description}</p>
          </div>
          {isActive ? (
            <span className="rounded-full border border-rag-green/40 bg-rag-green/10 px-3 py-1 text-xs font-medium text-rag-green">
              Connected
            </span>
          ) : isDisconnected ? (
            <span className="rounded-full border border-red-500/30 bg-red-500/5 px-3 py-1 text-xs font-medium text-rag-red">
              Disconnected
            </span>
          ) : isPending ? (
            <span className="rounded-full border border-cyan/30 bg-cyan/5 px-3 py-1 text-xs font-medium text-cyan-strong">
              Setup incomplete
            </span>
          ) : (
            <span className="rounded-full border border-gray-700 px-3 py-1 text-xs font-medium text-text-muted">
              Not connected
            </span>
          )}
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-text-muted">Loading connector status…</p>
        ) : (
          <div className="mt-4 space-y-3">
            {isActive && status?.mappedName ? (
              <p className="text-sm text-text-secondary">
                Mapped to <span className="text-text-primary">{status.mappedName}</span>
              </p>
            ) : null}

            {isDisconnected ? (
              <p className="text-sm text-rag-amber">
                Your {catalog.label} token expired. Reconnect to resume automatic data sync.
              </p>
            ) : null}

            {status?.lastSyncError ? (
              <p className="text-sm text-rag-red">Last sync error: {status.lastSyncError}</p>
            ) : null}

            {status?.oauthConfigured === false ? (
              <p className="text-sm text-rag-amber">
                {catalog.label} is not set up in this environment. Use manual input to generate reports, or add
                credentials to <code className="text-rag-amber">.env.local</code>.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {status?.oauthConfigured !== false ? (
                <button
                  type="button"
                  onClick={() => setWizardOpen(true)}
                  className="rounded-[3px] bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:bg-black"
                >
                  {isActive
                    ? `Manage ${catalog.label} connection`
                    : isDisconnected
                      ? `Reconnect ${catalog.label}`
                      : `Connect ${catalog.label}`}
                </button>
              ) : (
                <Link
                  href={`/input?projectId=${projectId}&manual=true`}
                  className="rounded-[3px] bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:bg-black"
                >
                  Enter data manually →
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      <ConnectorSetupWizard
        type={type}
        open={wizardOpen}
        projectId={projectId}
        projectName={projectName}
        onClose={() => setWizardOpen(false)}
        onComplete={() => void loadStatus()}
      />
    </>
  );
}
