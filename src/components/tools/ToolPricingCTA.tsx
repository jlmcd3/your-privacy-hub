/**
 * ToolPricingCTA — shared price + free-run indicator block for tool intake pages.
 *
 * Renders, in order:
 *   1. The tier-aware price (struck-through standalone for subscribers,
 *      "Subscriber price — 20%/25% off" note, or full standalone price).
 *   2. The free-run status line for logged-in paid subscribers
 *      ("🎁 You have 1 free tool run available this month — this run will be free."
 *       OR  "Free run used this month — [20%/25%] subscriber discount applies.")
 *   3. For anonymous / free users: "Intelligence subscribers get 20% off".
 *
 * Reads from the v7 PRICING config (src/config/pricing.ts).
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { checkFreeToolRun, type AnyTier } from "@/lib/freeToolRun";
import { PRICING, type ToolKey, getToolPrice } from "@/config/pricing";

interface Props {
  toolKey: ToolKey;
  /** Optional override label like "per assessment" / "per document". */
  unitLabel?: string;
  className?: string;
}

export default function ToolPricingCTA({ toolKey, unitLabel, className = "" }: Props) {
  const { user } = useAuth();
  const [tier, setTier] = useState<AnyTier>("free");
  const [hasFreeRun, setHasFreeRun] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(!user);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setTier("free");
      setHasFreeRun(false);
      setLoaded(true);
      return;
    }
    checkFreeToolRun(user.id).then((res) => {
      if (cancelled) return;
      setTier(res.tier);
      setHasFreeRun(res.hasFreeRun);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [user]);

  const tool = PRICING.tools[toolKey];
  const standaloneDollars = tool.dollars;
  const standaloneDisplay = tool.display;
  const isFreeTool = standaloneDollars === 0;
  const unit = unitLabel ? ` ${unitLabel}` : "";

  if (isFreeTool) {
    return (
      <div className={`text-sm ${className}`}>
        <span className="font-bold text-green-700">Free</span>
        <span className="text-muted-foreground"> · No account required</span>
      </div>
    );
  }

  if (!loaded) {
    return <div className={`text-sm text-muted-foreground ${className}`}>Loading pricing…</div>;
  }

  // Anonymous or free tier
  if (tier === "free") {
    return (
      <div className={`text-sm ${className}`}>
        <div className="font-bold text-navy">{standaloneDisplay}{unit}</div>
        <div className="text-meta text-muted-foreground mt-1">
          Intelligence subscribers: 20% off · Professional: 25% off
        </div>
      </div>
    );
  }

  // Paid subscriber — show discounted price
  const discountedPrice = getToolPrice(toolKey, tier);
  const discountPct = tier === "professional" ? "25%" : "20%";
  const tierLabel = tier === "professional" ? "Professional price" : "Subscriber price";

  return (
    <div className={`text-sm ${className}`}>
      <div className="flex items-baseline gap-2">
        <span className="font-bold text-navy">${discountedPrice}{unit}</span>
        <span className="line-through text-muted-foreground text-meta">{standaloneDisplay}</span>
      </div>
      <div className="text-meta text-amber-700 mt-1 font-medium">
        {tierLabel} — {discountPct} off
      </div>
      {hasFreeRun ? (
        <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md text-meta text-green-800">
          🎁 You have 1 free tool run available this month — this run will be free.
        </div>
      ) : (
        <div className="mt-2 text-meta text-muted-foreground">
          Free run used this month — {discountPct} subscriber discount applies.
        </div>
      )}
    </div>
  );
}
