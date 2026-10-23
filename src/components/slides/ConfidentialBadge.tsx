// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.

import { Lock } from "lucide-react";

export function ConfidentialBadge() {
  return (
    <>
      <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded border border-red-500 px-2 py-1 md:right-6 md:px-3">
        <Lock className="h-3 w-3 text-red-500" />
        <span className="text-[10px] font-bold tracking-widest text-red-500 md:text-xs">CONFIDENTIAL</span>
      </div>

      <div className="absolute left-1/2 top-2 z-20 hidden -translate-x-1/2 print:block">
        <span className="border-2 border-red-500 px-4 py-1 text-sm font-black tracking-[0.3em] text-red-500">
          CONFIDENTIAL
        </span>
      </div>
    </>
  );
}
