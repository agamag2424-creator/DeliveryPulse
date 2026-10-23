"use client";

import { useState } from "react";

import { ConnectorSetupWizard } from "@/components/connectors/ConnectorSetupWizard";
import { JiraSetupWizard } from "@/components/connectors/JiraSetupWizard";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import type { Project } from "@/context/ProjectContext";
import { CONNECTOR_CATALOG } from "@/lib/connectors/catalog-meta";
import type { ConnectorType } from "@/lib/connectors/types";

interface OnboardingFlowProps {
  onProjectCreated: (project: Project) => void;
}

export function OnboardingFlow({ onProjectCreated }: OnboardingFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [project, setProject] = useState<Project | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(true);
  const [jiraWizardOpen, setJiraWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<Exclude<ConnectorType, "JIRA"> | null>(null);
  const [connectedTypes, setConnectedTypes] = useState<string[]>([]);
  const [manualChosen, setManualChosen] = useState(false);

  function handleProjectCreated(created: Project) {
    setProject(created);
    setShowCreateModal(false);
    setStep(2);
    onProjectCreated(created);
  }

  async function continueManually() {
    await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "choose_manual" }),
    });
    setManualChosen(true);
    setStep(3);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-panel border border-border bg-background-card p-6 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">First 10 minutes</p>
          <h2 className="mt-1 text-lg font-semibold text-text-primary">
            {step === 1
              ? "Create your first project"
              : step === 2
                ? "Connect a tool (or continue manually)"
                : "Generate your first report"}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            The aha moment is a real weekly report for this workspace — not an empty dashboard.
          </p>
        </div>

        {step === 1 ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-text-secondary">
              Name the engagement you report on. You cannot skip this step.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="rounded-[3px] bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:bg-black"
            >
              Create project
            </button>
          </div>
        ) : null}

        {step === 2 && project ? (
          <div className="mt-4 space-y-4">
            {(["JIRA", "ASANA", "MONDAY", "TRELLO"] as const).map((type) => {
              const catalog = CONNECTOR_CATALOG[type];
              const connected = connectedTypes.includes(type);
              return (
                <div key={type} className="rounded-lg border border-border bg-background-elevated/40 p-4">
                  <p className="text-sm font-medium text-text-primary">{catalog.label}</p>
                  <p className="mt-1 text-xs text-text-muted">{catalog.description}</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (type === "JIRA") {
                        setJiraWizardOpen(true);
                      } else {
                        setWizardType(type);
                      }
                    }}
                    className="mt-3 rounded-lg border border-border px-3 py-2 text-sm text-text-primary hover:bg-background-elevated"
                  >
                    {connected ? "Connected" : "Connect →"}
                  </button>
                </div>
              );
            })}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={connectedTypes.length === 0}
                className="rounded-[3px] bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:bg-black disabled:opacity-60"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => void continueManually()}
                className="text-sm text-text-muted hover:text-text-primary"
              >
                Continue with manual input
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 && project ? (
          <div className="mt-4 space-y-4">
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>Project created: {project.name}</li>
              <li>
                {connectedTypes.length > 0
                  ? `Tool connected: ${connectedTypes.join(", ")}`
                  : manualChosen
                    ? "Manual input chosen"
                    : "No tool connected yet"}
              </li>
            </ul>
            <a
              href={`/projects/${project.id}`}
              className="inline-flex rounded-[3px] bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:bg-black"
            >
              Generate your first report →
            </a>
          </div>
        ) : null}

        <CreateProjectModal
          open={showCreateModal}
          dismissible={false}
          onClose={() => {
            if (project) {
              setShowCreateModal(false);
            }
          }}
          onCreated={handleProjectCreated}
        />

        {project ? (
          <JiraSetupWizard
            open={jiraWizardOpen}
            projectId={project.id}
            projectName={project.name}
            onClose={() => setJiraWizardOpen(false)}
            onComplete={() => {
              setConnectedTypes((current) => [...new Set([...current, "JIRA"])]);
              setStep(3);
            }}
          />
        ) : null}
        {project && wizardType ? (
          <ConnectorSetupWizard
            type={wizardType}
            open
            projectId={project.id}
            projectName={project.name}
            onClose={() => setWizardType(null)}
            onComplete={() => {
              setConnectedTypes((current) => [...new Set([...current, wizardType])]);
              setWizardType(null);
              setStep(3);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
