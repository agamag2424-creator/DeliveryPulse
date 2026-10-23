// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.

"use client";

import type { RAIDItem, ReportInput, SlideData } from "@/types/report";

import { RAIDItemCard } from "@/components/slides/RAIDItemCard";
import { RAIDMatrix } from "@/components/slides/RAIDMatrix";
import { SlideShell } from "@/components/slides/SlideShell";
import { SlideTitle } from "@/components/slides/SlideTitle";

interface Slide4Props {
  reportInput: ReportInput;
  reportOutput: SlideData;
}

function sortAttentionItems(items: RAIDItem[]) {
  return [...items].sort((a, b) => {
    if (a.rag !== b.rag) return a.rag === "RED" ? -1 : 1;
    return (b.score ?? 0) - (a.score ?? 0);
  });
}

export function Slide4({ reportOutput }: Slide4Props) {
  const sortedItems = sortAttentionItems(reportOutput.raid_attention_items);
  const visibleItems = sortedItems.slice(0, 2);
  const overflow = Math.max(0, sortedItems.length - visibleItems.length);

  return (
    <SlideShell slideNumber={4} totalSlides={6}>
      <div className="grid h-full grid-rows-[auto_58%_minmax(0,1fr)] gap-2">
        <SlideTitle title="Slide 4 - RAID Intelligence Dashboard" />
        <div className="min-h-0 overflow-hidden">
          <RAIDMatrix raidSummary={reportOutput.raid_summary} attentionItems={reportOutput.raid_attention_items} />
        </div>

        <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] pt-1">
          <p className="mb-1 text-xs uppercase tracking-wider text-gray-500">Attention Required</p>
          <div className="grid min-h-0 grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
            {visibleItems.map((item, index) => (
              <RAIDItemCard key={`${item.category}-${item.title}-${index}`} item={item} />
            ))}
          </div>
          {overflow > 0 ? (
            <p className="mt-2 text-xs text-gray-600">+ {overflow} more — see full log</p>
          ) : null}
        </section>
      </div>
    </SlideShell>
  );
}
