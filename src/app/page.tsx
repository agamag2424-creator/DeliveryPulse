import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-background-primary px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-140px)] w-full max-w-6xl flex-col justify-between gap-8">
        <section className="rounded-xl border border-border bg-background-card p-6 md:p-10">
          <div className="flex flex-col gap-5">
            <p className="text-sm text-text-secondary">AI-powered project status. Built for delivery leaders.</p>
            <h1 className="text-4xl font-bold text-text-primary md:text-6xl">DeliveryPulse</h1>
            <p className="max-w-3xl text-sm text-text-secondary md:text-base">
              Turn project status inputs into executive-ready reporting in minutes.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                className="rounded-lg bg-accent-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                href="/input"
              >
                Generate Status Report
              </Link>
              <Link
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-primary hover:bg-background-elevated"
                href="/input?demo=true"
              >
                Load Sample Demo
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-border bg-background-card p-6">
            <h2 className="text-lg font-semibold text-text-primary">AI-Generated Reports</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Convert project telemetry into concise weekly leadership narratives.
            </p>
          </article>
          <article className="rounded-xl border border-border bg-background-card p-6">
            <h2 className="text-lg font-semibold text-text-primary">Live Presentation Mode</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Present polished slides fullscreen with keyboard and touch navigation.
            </p>
          </article>
          <article className="rounded-xl border border-border bg-background-card p-6">
            <h2 className="text-lg font-semibold text-text-primary">Commercial Intelligence</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Surface financial trajectory, change impact, and execution confidence.
            </p>
          </article>
        </section>

        <footer className="pb-2 text-xs text-text-muted">
          DeliveryPulse by Agam Agrawwal — agam.ag2424@gmail.com
        </footer>
      </div>
    </main>
  );
}
