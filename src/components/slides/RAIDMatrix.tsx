import { AlertCircle, HelpCircle, Link2, Shield } from "lucide-react";

import { RAGBadge } from "@/components/slides/RAGBadge";
import type { RAIDItem, SlideData } from "@/types/report";

type QuadrantKey = keyof SlideData["raid_summary"];

interface RAIDMatrixProps {
  raidSummary: SlideData["raid_summary"];
  attentionItems: RAIDItem[];
}

function truncate(text: string, max = 52) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function getSeverityTag(items: RAIDItem[], category: RAIDItem["category"]) {
  const item = items.find((entry) => entry.category === category);
  if (!item?.severity_label) return null;
  if (/critical/i.test(item.severity_label)) {
    return <span className="ml-1 rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">Critical</span>;
  }
  if (/high/i.test(item.severity_label)) {
    return <span className="ml-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">High</span>;
  }
  return null;
}

function getTopItemFallback(items: RAIDItem[], category: RAIDItem["category"]) {
  return items.find((entry) => entry.category === category)?.title ?? "";
}

function quadrantStyles(rag: SlideData["raid_summary"][QuadrantKey]["rag"], hasItems: boolean) {
  if (!hasItems || rag === "GREY") {
    return {
      background: "rgba(107,114,128,0.10)",
      border: "#374151",
      label: "text-gray-500",
    };
  }
  if (rag === "RED") {
    return {
      background: "rgba(239,68,68,0.12)",
      border: "#EF4444",
      label: "text-rag-red",
    };
  }
  if (rag === "AMBER") {
    return {
      background: "rgba(245,158,11,0.12)",
      border: "#F59E0B",
      label: "text-rag-amber",
    };
  }
  return {
    background: "rgba(16,185,129,0.12)",
    border: "#10B981",
    label: "text-rag-green",
  };
}

function Quadrant({
  title,
  icon,
  category,
  data,
  attentionItems,
}: {
  title: string;
  icon: React.ReactNode;
  category: RAIDItem["category"];
  data: SlideData["raid_summary"][QuadrantKey];
  attentionItems: RAIDItem[];
}) {
  const hasItems = data.total > 0;
  const styles = quadrantStyles(data.rag, hasItems);
  const topSeverity = getSeverityTag(attentionItems, category);
  const previewText = data.top_item?.trim() ? data.top_item : getTopItemFallback(attentionItems, category);

  return (
    <article
      className="rounded-xl border-2 p-3 md:p-4"
      style={{ backgroundColor: styles.background, borderColor: styles.border }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider ${styles.label}`}>
          {icon}
          <span>{title}</span>
        </div>
        {data.rag === "GREY" ? null : <RAGBadge status={data.rag} size="mini" />}
      </div>

      {hasItems ? (
        <>
          <div className="mt-2">
            <p className="text-2xl font-black text-white">{data.attention}</p>
            <p className="text-xs text-gray-400">of {data.total} need attention</p>
          </div>
          <p className="text-xs text-green-400">{data.managed} actively managed ✅</p>
          {data.attention > 0 ? (
            <div className="mt-2 hidden truncate text-xs italic text-gray-400 md:block">
              → {truncate(previewText)}
              {topSeverity}
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-sm text-gray-600">No items logged this period</p>
      )}
    </article>
  );
}

export function RAIDMatrix({ raidSummary, attentionItems }: RAIDMatrixProps) {
  return (
    <section>
      <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">
        RAID Intelligence - Items Requiring Attention
      </p>
      <div className="grid h-full grid-cols-2 gap-3">
        <Quadrant
          title="Risks"
          icon={<Shield className="h-3.5 w-3.5" />}
          category="RISK"
          data={raidSummary.risks}
          attentionItems={attentionItems}
        />
        <Quadrant
          title="Issues"
          icon={<AlertCircle className="h-3.5 w-3.5" />}
          category="ISSUE"
          data={raidSummary.issues}
          attentionItems={attentionItems}
        />
        <Quadrant
          title="Dependencies"
          icon={<Link2 className="h-3.5 w-3.5" />}
          category="DEPENDENCY"
          data={raidSummary.dependencies}
          attentionItems={attentionItems}
        />
        <Quadrant
          title="Assumptions"
          icon={<HelpCircle className="h-3.5 w-3.5" />}
          category="ASSUMPTION"
          data={raidSummary.assumptions}
          attentionItems={attentionItems}
        />
      </div>
    </section>
  );
}
