// Design Alignment: paper panel sections for ChisokuLabs chrome.

"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface SectionWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function SectionWrapper({
  title,
  description,
  children,
  defaultOpen = true,
}: SectionWrapperProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-panel border border-line bg-paper">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
        onClick={() => setIsOpen((previous) => !previous)}
      >
        <div>
          <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">{title}</h2>
          {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-text-secondary transition-transform ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {isOpen ? <div className="border-t border-line px-6 py-5">{children}</div> : null}
    </section>
  );
}
