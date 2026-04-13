"use client";

import { Edit2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ExecutiveSummaryPanelProps {
  value: string;
  originalValue?: string;
  onChange: (value: string) => void;
}

export function ExecutiveSummaryPanel({ value, originalValue, onChange }: ExecutiveSummaryPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [draft, setDraft] = useState(value);
  const [initialValue] = useState((originalValue ?? value).trim());

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit() {
    const next = draft.trim();
    onChange(next.length > 0 ? next : value);
    setIsEditing(false);
  }

  const edited = initialValue !== value.trim();

  return (
    <section
      className="rounded-xl border border-border bg-[#111827] p-4 md:p-6"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Executive Summary</h3>
          {edited ? <span className="text-xs text-rag-amber">● edited</span> : null}
        </div>
        {!isEditing && isHovering ? <Edit2 className="h-4 w-4 text-gray-500" data-export-hide="true" /> : null}
      </div>

      {isEditing ? (
        <textarea
          autoFocus
          rows={5}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          className="w-full rounded-lg border border-accent-blue bg-background-card p-3 text-base leading-relaxed text-gray-200 outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="w-full rounded-lg border border-transparent p-1 text-left text-base leading-relaxed text-gray-200 transition hover:border-border"
        >
          {value}
        </button>
      )}
    </section>
  );
}
