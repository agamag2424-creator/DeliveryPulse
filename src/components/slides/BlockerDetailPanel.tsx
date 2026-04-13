interface BlockerDetailItem {
  workstream: string;
  description: string;
  type: "Internal" | "External" | "Client" | "Vendor";
  daysOpen: number;
  owner: string;
  impact: string;
}

interface BlockerDetailPanelProps {
  blockers: BlockerDetailItem[];
}

const typeStyles: Record<BlockerDetailItem["type"], string> = {
  Internal: "bg-blue-500/20 text-blue-400",
  External: "bg-purple-500/20 text-purple-400",
  Client: "bg-amber-500/20 text-amber-400",
  Vendor: "bg-pink-500/20 text-pink-400",
};

export function BlockerDetailPanel({ blockers }: BlockerDetailPanelProps) {
  const hasBlockers = blockers.length > 0;

  return (
    <section className="h-full">
      <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">Active Blockers</p>

      {!hasBlockers ? (
        <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
          <span className="text-2xl">✅</span>
          <p className="text-sm font-medium text-green-400">No active blockers this week</p>
        </div>
      ) : (
        <div className="max-h-[260px] overflow-y-auto pr-1 md:max-h-[290px]">
          {blockers.map((blocker, index) => {
            const isAged = blocker.daysOpen >= 5;
            return (
              <article
                key={`${blocker.workstream}-${blocker.description}-${index}`}
                className={`mb-3 rounded-lg border-l-4 bg-[#111827] p-4 ${
                  isAged ? "border-red-500" : "border-amber-500"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${typeStyles[blocker.type]}`}>{blocker.type}</span>
                  <span className={`text-xs ${isAged ? "font-semibold text-red-400" : "text-gray-500"}`}>
                    {blocker.daysOpen} days{isAged ? " ⚠️" : ""}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-white">{blocker.description}</p>
                <p className="mt-1 text-xs text-gray-500">Owner: {blocker.owner}</p>
                <p className="mt-1 text-xs text-amber-400/80">Impact: {blocker.impact}</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export type { BlockerDetailItem };
