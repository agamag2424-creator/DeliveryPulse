"use client";

import { useEffect, useState } from "react";

import { FormInput } from "@/components/form/FormInput";
import { FormSelect } from "@/components/form/FormSelect";
import type { Project } from "@/context/ProjectContext";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
  dismissible?: boolean;
}

export function CreateProjectModal({
  open,
  onClose,
  onCreated,
  dismissible = true,
}: CreateProjectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [phase, setPhase] = useState("Build");
  const [engagementModel, setEngagementModel] = useState("TNM");
  const [contractValue, setContractValue] = useState("");
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && dismissible) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, dismissible]);

  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          clientName,
          startDate,
          endDate,
          phase,
          engagementModel,
          currency,
          contractValue: contractValue ? Number(contractValue) : 0,
        }),
      });

      const payload = (await response.json()) as { project?: Project; error?: string };
      if (!response.ok || !payload.project) {
        if (response.status === 401) {
          setError("Please sign in to create a project.");
          return;
        }
        setError(payload.error ?? "Failed to create project");
        return;
      }

      onCreated(payload.project);
      setName("");
      setClientName("");
      setStartDate("");
      setEndDate("");
      setPhase("Build");
      setEngagementModel("TNM");
      setContractValue("");
      setCurrency("USD");
    } catch {
      setError("Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {dismissible ? (
        <button
          type="button"
          aria-label="Close create project modal"
          className="absolute inset-0 bg-black/60"
          onClick={onClose}
        />
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
        className="relative z-10 w-full max-w-2xl rounded-panel border border-line bg-paper p-6 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="create-project-title" className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">
            Create project
          </h2>
          {dismissible ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-[3px] px-2 py-1 text-sm text-text-muted hover:bg-faint hover:text-ink"
            >
              Close
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-rag-red/40 bg-rag-red/10 px-4 py-3 text-sm text-rag-red">
            {error}
          </div>
        ) : null}

        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <FormInput id="project-name" label="Project Name" mandatory value={name} onChange={(e) => setName(e.target.value)} />
          <FormInput id="client-name" label="Client Name" mandatory value={clientName} onChange={(e) => setClientName(e.target.value)} />
          <FormInput id="start-date" label="Start Date" type="date" mandatory value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <FormInput id="end-date" label="End Date" type="date" mandatory value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <FormSelect
            id="phase"
            label="Current Phase"
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            options={[
              { value: "Initiation", label: "Initiation" },
              { value: "Planning", label: "Planning" },
              { value: "Build", label: "Build" },
              { value: "Testing", label: "Testing" },
              { value: "Go-Live", label: "Go-Live" },
              { value: "Hypercare", label: "Hypercare" },
            ]}
          />
          <FormSelect
            id="engagement-model"
            label="Engagement Model"
            value={engagementModel}
            onChange={(e) => setEngagementModel(e.target.value)}
            options={[
              { value: "TNM", label: "T&M" },
              { value: "FP", label: "Fixed Price" },
            ]}
          />
          <FormInput id="contract-value" label="Contract Value" type="number" value={contractValue} onChange={(e) => setContractValue(e.target.value)} />
          <FormSelect
            id="currency"
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={[
              { value: "USD", label: "USD" },
              { value: "GBP", label: "GBP" },
              { value: "EUR", label: "EUR" },
              { value: "INR", label: "INR" },
            ]}
          />
          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-[3px] bg-ink px-4 py-2.5 text-sm font-semibold text-cream hover:bg-black disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : "Create Project"}
            </button>
            {dismissible ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-[3px] border border-ink px-4 py-2.5 text-sm font-semibold text-ink hover:bg-faint"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
