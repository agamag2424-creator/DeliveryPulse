// Design Alignment: marketing-adjacent home uses Chisoku paper/ink chrome.
// Report slides remain Phase 1 frozen until explicit unfreeze.

import Link from "next/link";

export default function Home() {
  return (
    <main className="px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-140px)] w-full max-w-6xl flex-col justify-between gap-8">
        <section className="rounded-panel border border-line bg-paper p-6 md:p-10">
          <div className="flex flex-col gap-5">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-strong">
              Status intelligence
            </p>
            <h1 className="font-display text-4xl font-extrabold tracking-[-0.04em] text-ink md:text-6xl">
              DeliveryPulse
            </h1>
            <p className="max-w-3xl text-sm text-text-secondary md:text-base">
              Turn project status inputs into executive-ready reporting in minutes.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                className="rounded-[3px] bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-black"
                href="/input"
              >
                Generate Status Report
              </Link>
              <Link
                className="rounded-[3px] border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-faint"
                href="/input?demo=true"
              >
                Load Sample Demo
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-panel border border-line bg-paper p-6">
            <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">AI-Generated Reports</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Convert project telemetry into concise weekly leadership narratives.
            </p>
          </article>
          <article className="rounded-panel border border-line bg-paper p-6">
            <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">Live Presentation Mode</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Present polished slides fullscreen with keyboard and touch navigation.
            </p>
          </article>
          <article className="rounded-panel border border-line bg-paper p-6">
            <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">Commercial Intelligence</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Surface financial trajectory, change impact, and execution confidence.
            </p>
          </article>
        </section>

        <footer className="pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">
          DeliveryPulse by ChisokuLabs
        </footer>
      </div>
    </main>
  );
}
