"use client";

interface SlideShellProps {
  slideNumber: number;
  totalSlides: number;
  children: React.ReactNode;
}

export function SlideShell({ slideNumber, totalSlides, children }: SlideShellProps) {
  return (
    <section className="w-full" data-export-slide="true">
      <div className="relative mx-auto w-full max-w-[1280px] rounded-xl border border-border bg-background-card">
        <div className="relative h-[560px] w-full overflow-hidden p-4 md:h-[640px] md:p-8 lg:h-[720px] lg:p-10">
          {children}
        </div>
        <div className="absolute bottom-3 right-3 rounded-full border border-border bg-background-elevated px-3 py-1 text-xs font-semibold text-text-secondary">
          {slideNumber} / {totalSlides}
        </div>
      </div>
    </section>
  );
}
