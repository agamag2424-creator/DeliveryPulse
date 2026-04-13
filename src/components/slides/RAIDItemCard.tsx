import { Flag, Target, User } from "lucide-react";

import type { RAIDItem } from "@/types/report";

interface RAIDItemCardProps {
  item: RAIDItem;
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

const categoryStyles: Record<RAIDItem["category"], string> = {
  RISK: "bg-red-500/20 text-red-400",
  ISSUE: "bg-orange-500/20 text-orange-400",
  DEPENDENCY: "bg-purple-500/20 text-purple-400",
  ASSUMPTION: "bg-blue-500/20 text-blue-400",
};

export function RAIDItemCard({ item }: RAIDItemCardProps) {
  const borderClass = item.rag === "RED" ? "border-red-500" : "border-amber-500";
  const ownerUnowned = item.owner === "Unowned";

  return (
    <article className={`relative rounded-xl border-l-4 bg-[#111827] p-2.5 ${borderClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${categoryStyles[item.category]}`}>
          {item.category}
        </span>
        <span className="text-xs text-gray-500">{item.severity_label}</span>
      </div>

      <h4 className="mt-1 text-[11px] font-semibold leading-snug text-white" title={item.title}>
        {truncate(item.title, 85)}
      </h4>

      <div className="mt-0.5 flex items-center text-[10px]">
        <User className="mr-1 h-3 w-3 text-gray-600" />
        {ownerUnowned ? (
          <span className="font-semibold text-red-400">⚠️ Unowned</span>
        ) : (
          <span className="text-gray-400">{item.owner}</span>
        )}
      </div>

      {item.threatens ? (
        <div className="mt-0.5 flex items-center text-[10px] text-gray-500">
          <Target className="mr-1 h-3 w-3 text-gray-600" />
          <span title={item.threatens}>Threatens: {truncate(item.threatens, 70)}</span>
        </div>
      ) : null}

      <div className="mt-1">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-500">Action Required</p>
        <p className="mt-0.5 text-[10px] leading-snug text-gray-300" title={item.action_required}>
          {truncate(item.action_required, 130)}
        </p>
      </div>

      {item.linked_decision ? (
        <div className="absolute bottom-1.5 right-1.5 flex items-center text-[10px] text-blue-400">
          <Flag className="mr-1 h-3 w-3" />
          <span>Decision linked</span>
        </div>
      ) : null}
    </article>
  );
}
