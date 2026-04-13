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
    <section className="rounded-xl border border-border bg-background-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
        onClick={() => setIsOpen((previous) => !previous)}
      >
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-text-secondary transition-transform ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {isOpen ? <div className="border-t border-border px-6 py-5">{children}</div> : null}
    </section>
  );
}
