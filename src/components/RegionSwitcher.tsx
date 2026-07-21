// UX-2a — Persistent header region switcher.
// Explicit user choice always wins and is stored via useRegion (localStorage).

import { useRegion } from "@/hooks/useRegion";

export default function RegionSwitcher({ className = "" }: { className?: string }) {
  const { region, toggleRegion } = useRegion();
  const current = region === "US" ? "US" : "EU/UK";
  const other = region === "US" ? "EU/UK" : "US";
  return (
    <button
      type="button"
      onClick={toggleRegion}
      aria-label={`Viewing ${current}. Switch to ${other}.`}
      className={`inline-flex items-center gap-1.5 text-[11px] lg:text-xs font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-2.5 py-1 transition-colors no-underline ${className}`}
    >
      <span className="opacity-80">Viewing:</span>
      <span className="font-semibold">{current}</span>
      <span aria-hidden="true" className="opacity-60">·</span>
      <span className="underline underline-offset-2">Switch to {other}</span>
    </button>
  );
}
