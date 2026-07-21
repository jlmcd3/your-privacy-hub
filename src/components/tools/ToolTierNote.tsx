import { Link } from "react-router-dom";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { CheckCircle2 } from 'lucide-react';

interface ToolTierNoteProps {
  /** When true, this is a CPPA tool (per-use, subscriber rate, never "included"). */
  isCppa?: boolean;
  /** Optional className override on the wrapper. */
  className?: string;
  /** When true, this is a Layer-1 included tool (RoPA, notices, IR, biometric, DPA). */
  isIncluded?: boolean;
}

/**
 * v9 tier-aware messaging on tool pages. The "Annual Platform" branch is
 * retired — included tools are now included with ANY active subscription
 * (monthly or annual), and per-use tools always show the subscriber rate
 * banner to active subscribers.
 *
 *   Subscriber + included tool → " Included with your subscription"
 *   Subscriber + per-use tool  → " Subscriber rate applied"
 *   Non-subscriber             → renders nothing
 */
export default function ToolTierNote({
  isCppa = false,
  className = "",
  isIncluded = false,
}: ToolTierNoteProps) {
  const { isPremium, isInTrial } = useSubscriptionTier();
  if (!isPremium || isInTrial) return null;

  if (isIncluded) {
    return (
      <p
        className={`text-[12px] text-brand-teal-text bg-brand-teal/10 border border-brand-teal/30 rounded-lg px-3 py-2 mt-2 ${className}`}
      >
        <CheckCircle2 aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Included with your subscription —{" "}
        <Link to="/account" className="underline">
          manage in account
        </Link>
        .
      </p>
    );
  }

  return (
    <p
      className={`text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 ${className}`}
    >
      <CheckCircle2 aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Subscriber rate applied{isCppa ? " (CPPA modules)" : ""}.
    </p>
  );
}
