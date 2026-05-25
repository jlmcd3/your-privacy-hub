import { Link } from "react-router-dom";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

interface ToolTierNoteProps {
  /** When true, this is a CPPA tool (annual gets discounted, not free). */
  isCppa?: boolean;
  /** Optional className override on the wrapper. */
  className?: string;
}

/**
 * Inline tier-aware messaging for tool pages under the New Model.
 *
 *   Annual (standard tool): green "Included in your Annual Platform" badge.
 *   Annual (CPPA tool):     amber "Subscriber rate applied" badge.
 *   Monthly:                gentle upsell to Annual Platform.
 *   Free / anon:            renders nothing (price label already speaks for itself).
 */
export default function ToolTierNote({ isCppa = false, className = "" }: ToolTierNoteProps) {
  const { tier } = useSubscriptionTier();

  if (tier === "annual" || tier === "annual_founding") {
    if (isCppa) {
      return (
        <p
          className={`text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 ${className}`}
        >
          ✓ Subscriber rate applied — included tools are listed in your{" "}
          <Link to="/account" className="underline">
            account
          </Link>
          .
        </p>
      );
    }
    return (
      <p
        className={`text-[12px] text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mt-2 ${className}`}
      >
        ✓ Included in your Annual Platform — generate as many as you need.
      </p>
    );
  }

  if (tier === "monthly") {
    return (
      <p className={`text-[11px] text-slate mt-2 ${className}`}>
        Annual Platform subscribers get this tool {isCppa ? "at the subscriber rate" : "included"}.
        <Link to="/subscribe" className="text-brand-navy underline ml-1">
          Upgrade →
        </Link>
      </p>
    );
  }

  return null;
}
