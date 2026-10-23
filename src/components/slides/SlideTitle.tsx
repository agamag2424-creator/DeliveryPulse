// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.

interface SlideTitleProps {
  title: string;
}

export function SlideTitle({ title }: SlideTitleProps) {
  return (
    <div className="inline-flex w-fit items-center rounded-md border border-accent-blue/50 bg-accent-blue/10 px-3 py-1.5">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-blue">{title}</p>
    </div>
  );
}
