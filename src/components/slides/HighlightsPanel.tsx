"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

interface HighlightListProps {
  items: string[];
  icon: string;
  accentClass: string;
  onChange: (items: string[]) => void;
}

function EditableHighlightList({ items, icon, accentClass, onChange }: HighlightListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const safeItems = items.slice(0, 4);

  function commit(index: number) {
    const next = [...safeItems];
    next[index] = draft.trim() || safeItems[index];
    onChange(next);
    setEditingIndex(null);
    setDraft("");
  }

  return (
    <ul className="space-y-2">
        {safeItems.map((item, index) => (
          <li key={`${icon}-${index}`}>
            {editingIndex === index ? (
              <input
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => commit(index)}
                className={`w-full rounded-md border bg-background-card px-2 py-1 text-sm text-text-primary outline-none ${accentClass}`}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraft(safeItems[index] ?? "");
                  setEditingIndex(index);
                }}
                className={`group flex w-full items-center gap-2 rounded-md border border-transparent border-l-2 px-1 py-1 text-left text-sm text-text-primary hover:border-border ${accentClass}`}
                title={item}
              >
                <span>{icon}</span>
                <span className="truncate">{item}</span>
                <Pencil className="ml-auto hidden h-3.5 w-3.5 shrink-0 text-text-muted group-hover:block" data-export-hide="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
  );
}

interface HighlightsPanelProps {
  wins: string[];
  concerns: string[];
  onWinsChange: (items: string[]) => void;
  onConcernsChange: (items: string[]) => void;
}

export function HighlightsPanel({
  wins,
  concerns,
  onWinsChange,
  onConcernsChange,
}: HighlightsPanelProps) {
  return (
    <section className="rounded-xl border border-border bg-background-elevated p-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Highlights</p>
      <p className="mb-3 mt-1 text-xs font-semibold uppercase tracking-wide text-text-muted">This Week</p>

      <EditableHighlightList items={wins} icon="✅" accentClass="border-rag-green/60" onChange={onWinsChange} />
      <div className="my-2 h-px bg-border" />
      <EditableHighlightList
        items={concerns}
        icon="⚠️"
        accentClass="border-rag-amber/70"
        onChange={onConcernsChange}
      />
    </section>
  );
}
