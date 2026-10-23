"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { JiraSetupWizard } from "@/components/connectors/JiraSetupWizard";

interface JiraConnectorCardProps {
  projectId: string;
  projectName: string;
  autoOpenWizard?: boolean;
}

interface ConnectorStatusResponse {
  connected: boolean;
  status: string | null;
  setupComplete: boolean;
  jiraProjectName: string | null;
  lastSyncError?: string | null;
  oauthConfigured?: boolean;
}

export function JiraConnectorCard({ projectId, projectName, autoOpenWizard = false }: JiraConnectorCardProps) {
  const [status, setStatus] = useState<ConnectorStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(autoOpenWizard);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/connectors/jira/status?projectId=${projectId}`);
      const payload = (await response.json()) as ConnectorStatusResponse;
      if (response.ok) {
        setStatus(payload);
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

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
            <h3 className="text-base font-semibold text-text-primary">Jira</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Pull sprint tasks, blockers, and team activity into report generation.
            </p>
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
            {isActive && status?.jiraProjectName ? (
              <p className="text-sm text-text-secondary">
                Mapped to <span className="text-text-primary">{status.jiraProjectName}</span>
              </p>
            ) : null}

            {isDisconnected ? (
              <p className="text-sm text-rag-amber">
                Your Jira token expired. Reconnect to resume automatic data sync.
              </p>
            ) : null}

            {status?.lastSyncError ? (
              <p className="text-sm text-rag-red">Last sync error: {status.lastSyncError}</p>
            ) : null}

            {status?.oauthConfigured === false ? (
              <p className="text-sm text-rag-amber">
                Jira OAuth is not set up in this environment. Use manual input to generate reports, or add Jira
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
                  {isActive ? "Manage Jira connection" : isDisconnected ? "Reconnect Jira" : "Connect Jira"}
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

      <JiraSetupWizard
        open={wizardOpen}
        projectId={projectId}
        projectName={projectName}
        onClose={() => setWizardOpen(false)}
        onComplete={() => void loadStatus()}
      />
    </>
  );
}
