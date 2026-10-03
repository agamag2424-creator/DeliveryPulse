"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CONNECTOR_CATALOG } from "@/lib/connectors/catalog-meta";
import type { ConnectorPreviewData, ConnectorType, ExternalResource } from "@/lib/connectors/types";
import { connectorTypeToSlug } from "@/lib/connectors/types";

type WizardStep = "connect" | "select" | "preview";

interface ConnectorStatus {
  connected: boolean;
  status: string | null;
  setupComplete: boolean;
  mappedName: string | null;
  oauthConfigured?: boolean;
}

interface ConnectorSetupWizardProps {
  type: Exclude<ConnectorType, "JIRA">;
  open: boolean;
  projectId: string;
  projectName: string;
  onClose: () => void;
  onComplete: () => void;
}

export function ConnectorSetupWizard({
  type,
  open,
  projectId,
  projectName,
  onClose,
  onComplete,
}: ConnectorSetupWizardProps) {
  const catalog = CONNECTOR_CATALOG[type];
  const slug = connectorTypeToSlug(type);
  const [step, setStep] = useState<WizardStep>("connect");
  const [status, setStatus] = useState<ConnectorStatus | null>(null);
  const [projects, setProjects] = useState<ExternalResource[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [preview, setPreview] = useState<ConnectorPreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void loadStatus();
  }, [open, projectId, type]);

  async function loadStatus() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/connectors/${slug}/status?projectId=${projectId}`);
      const payload = (await response.json()) as ConnectorStatus & { error?: string };
      if (!response.ok) {
        setError(payload.error ?? `Failed to load ${catalog.label} status`);
        return;
      }

      setStatus(payload);
      if (payload.status === "DISCONNECTED") {
        setStep("connect");
        return;
      }
      if (payload.setupComplete) {
        setStep("preview");
        await loadPreview();
        return;
      }
      if (payload.connected) {
        await loadProjects();
        setStep("select");
      } else {
        setStep("connect");
      }
    } catch {
      setError(`Failed to load ${catalog.label} status`);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadProjects() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/connectors/${slug}/projects?projectId=${projectId}`);
      const payload = (await response.json()) as { projects?: ExternalResource[]; error?: string };
      if (!response.ok) {
        setError(payload.error ?? `Failed to load ${catalog.resourceLabel}s`);
        return;
      }
      const list = payload.projects ?? [];
      setProjects(list);
      if (list[0]) {
        setSelectedProjectId(list[0].id);
      }
    } catch {
      setError(`Failed to load ${catalog.resourceLabel}s`);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPreview() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/connectors/${slug}/preview?projectId=${projectId}`);
      const payload = (await response.json()) as { preview?: ConnectorPreviewData; error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Failed to load preview");
        return;
      }
      setPreview(payload.preview ?? null);
      setStep("preview");
    } catch {
      setError("Failed to load preview");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSelectProject() {
    const selected = projects.find((project) => project.id === selectedProjectId);
    if (!selected) {
      setError(`Select a ${catalog.resourceLabel}`);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/connectors/${slug}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          externalId: selected.id,
          externalKey: selected.key,
          externalName: selected.name,
        }),
      });
      const payload = (await response.json()) as { preview?: ConnectorPreviewData; error?: string };
      if (!response.ok) {
        setError(payload.error ?? `Failed to map ${catalog.resourceLabel}`);
        return;
      }
      setPreview(payload.preview ?? null);
      setStep("preview");
    } catch {
      setError(`Failed to map ${catalog.resourceLabel}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirm() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/connectors/${slug}/connect`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? `Failed to confirm ${catalog.label} connection`);
        return;
      }
      onComplete();
      onClose();
    } catch {
      setError(`Failed to confirm ${catalog.label} connection`);
    } finally {
      setIsLoading(false);
    }
  }

  if (!open) {
    return null;
  }

  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label={`Close ${catalog.label} setup`} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${slug}-setup-title`}
        className="relative z-10 w-full max-w-lg rounded-panel border border-border bg-background-card p-6 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={`${slug}-setup-title`} className="text-lg font-semibold text-text-primary">
              Connect {catalog.label}
            </h2>
            <p className="mt-1 text-sm text-text-muted">{projectName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-text-muted hover:bg-background-elevated hover:text-text-primary"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          {(["connect", "select", "preview"] as WizardStep[]).map((item, index) => (
            <div
              key={item}
              className={`h-1 flex-1 rounded-full ${
                step === item || (step === "preview" && index < 2) || (step === "select" && index === 0)
                  ? "bg-cyan"
                  : "bg-border"
              }`}
            />
          ))}
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-rag-red/40 bg-rag-red/10 px-4 py-3 text-sm text-rag-red">{error}</div>
        ) : null}

        {isLoading ? <p className="mt-6 text-sm text-text-secondary">Loading…</p> : null}

        {!isLoading && step === "connect" ? (
          <div className="mt-6 space-y-4">
            {status?.status === "DISCONNECTED" ? (
              <div className="rounded-lg border border-rag-amber/40 bg-rag-amber/10 px-4 py-3 text-sm text-rag-amber">
                Your {catalog.label} connection expired. Reconnect to continue using that data.
              </div>
            ) : null}
            <p className="text-sm text-text-secondary">
              Delivery Pulse will read {catalog.resourceLabel} data for this workspace. Read-only access only.
            </p>
            {status?.oauthConfigured === false ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-rag-amber/40 bg-rag-amber/10 px-4 py-3 text-sm text-rag-amber">
                  {catalog.label} is not configured in this environment. Add the {catalog.label} credentials to{" "}
                  <code className="text-rag-amber">.env.local</code>.
                </div>
                <Link
                  href={`/input?projectId=${projectId}&manual=true`}
                  className="inline-flex rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-background-elevated"
                >
                  Enter project data manually →
                </Link>
              </div>
            ) : (
              <a
                href={`/api/connectors/${slug}/auth?projectId=${projectId}`}
                className="inline-flex rounded-[3px] bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:bg-black"
              >
                Connect {catalog.label}
              </a>
            )}
          </div>
        ) : null}

        {!isLoading && step === "select" ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-text-secondary">
              Which {catalog.resourceLabel} is {projectName}?
            </p>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {projects.map((project) => (
                <label
                  key={project.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${
                    selectedProjectId === project.id
                      ? "border-cyan bg-cyan/5"
                      : "border-border bg-background-elevated/40"
                  }`}
                >
                  <input
                    type="radio"
                    name={`${slug}-resource`}
                    value={project.id}
                    checked={selectedProjectId === project.id}
                    onChange={() => setSelectedProjectId(project.id)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{project.name}</p>
                    {project.key !== project.name ? (
                      <p className="text-xs text-text-muted">{project.key}</p>
                    ) : null}
                  </div>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void handleSelectProject()}
              disabled={!selectedProject}
              className="rounded-[3px] bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:bg-black disabled:opacity-60"
            >
              Connect this {catalog.resourceLabel} →
            </button>
          </div>
        ) : null}

        {!isLoading && step === "preview" && preview ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-rag-green/40 bg-rag-green/10 px-4 py-3 text-sm text-rag-green">
              {catalog.label} connected
            </div>
            <div className="space-y-2 text-sm text-text-secondary">
              <p>I found in {preview.sprintName || catalog.resourceLabel}:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  {preview.tasksPlanned} tasks ({preview.tasksCompleted} complete, {preview.tasksInProgress} in
                  progress, {preview.tasksBlocked} blocked)
                </li>
                <li>
                  {preview.blockerCount} active blocker{preview.blockerCount === 1 ? "" : "s"}
                </li>
                <li>
                  {preview.teamMemberCount} team member{preview.teamMemberCount === 1 ? "" : "s"}
                </li>
              </ul>
              <p className="pt-2 text-text-primary">Does this look right?</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {!status?.setupComplete ? (
                <button
                  type="button"
                  onClick={() => void handleConfirm()}
                  className="rounded-[3px] bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:bg-black"
                >
                  Yes, start using {catalog.label} data
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[3px] bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:bg-black"
                >
                  Done
                </button>
              )}
              {!status?.setupComplete ? (
                <button
                  type="button"
                  onClick={() => {
                    setStep("select");
                    void loadProjects();
                  }}
                  className="rounded-[3px] border border-ink px-4 py-2.5 text-sm font-semibold text-ink hover:bg-faint"
                >
                  Select a different {catalog.resourceLabel}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
