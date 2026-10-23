// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.

"use client";

interface SlideShellProps {
  slideNumber: number;
  totalSlides: number;
  children: React.ReactNode;
}

export function SlideShell({ slideNumber, totalSlides, children }: SlideShellProps) {
  return (
    <section className="w-full" data-export-slide="true">
      <div
        className="slide-page relative mx-auto w-full max-w-[1280px] rounded-xl border border-border bg-background-card"
        style={{ aspectRatio: "16/9" }}
      >
        <div className="relative h-[560px] w-full overflow-hidden p-4 md:h-[640px] md:p-8 lg:h-[720px] lg:p-10">
          {children}
        </div>
        <div className="no-print absolute bottom-3 right-3 rounded-full border border-border bg-background-elevated px-3 py-1 text-xs font-semibold text-text-secondary">
          {slideNumber} / {totalSlides}
        </div>
      </div>
    </section>
  );
}
