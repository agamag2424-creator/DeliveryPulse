import { Lock } from "lucide-react";

export function ConfidentialBadge() {
  return (
    <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded border border-red-500 px-2 py-1 md:right-6 md:px-3">
      <Lock className="h-3 w-3 text-red-500" />
      <span className="text-[10px] font-bold tracking-widest text-red-500 md:text-xs">CONFIDENTIAL</span>
    </div>
  );
}
