import { Link } from "react-router-dom";

/**
 * Reusable ⭐ Premium badge for gated content markers.
 */
export default function PremiumBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full ${className}`}
    >
      ⭐ Professional
    </span>
  );
}
