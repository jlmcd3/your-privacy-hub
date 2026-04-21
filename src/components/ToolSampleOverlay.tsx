import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

interface Props {
  /** The sample preview content to render under the blur overlay */
  children: ReactNode;
  toolName: string;
  /** CTA label, e.g. "Generate — $39" or "Generate — Free" */
  priceLabel: string;
  /** Called when the CTA is clicked */
  onPurchase: () => void;
  isFreeForUser: boolean;
  isPremium: boolean | null;
  subscriberPrice: number | null;
  standalonePrice: number | null;
}

export default function ToolSampleOverlay({
  children,
  toolName,
  priceLabel,
  onPurchase,
  isFreeForUser,
  isPremium,
  subscriberPrice,
  standalonePrice,
}: Props) {
  // Subscribers-pay-discount messaging
  const showSubscriberDiscount =
    !isPremium && subscriberPrice !== null && standalonePrice !== null && subscriberPrice < standalonePrice;
  // Free-for-subscriber messaging
  const showFreeForSubscribers = !isPremium && subscriberPrice === null && standalonePrice !== null;

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Blurred sample */}
      <div className="select-none pointer-events-none" style={{ filter: "blur(5px)" }} aria-hidden>
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/65 backdrop-blur-[2px]">
        <div className="text-center px-6 py-6 max-w-sm">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 mb-3">
            <Lock className="w-3 h-3" />
            Premium Tool
          </span>
          <p className="text-[13px] text-muted-foreground leading-snug mb-4">{toolName} — full output above</p>
          <button
            onClick={onPurchase}
            type="button"
            className="w-full bg-gradient-to-br from-navy to-blue text-white font-semibold text-[14px] px-6 py-3 rounded-xl hover:opacity-90 transition-all mb-3"
          >
            {priceLabel}
          </button>
          {showSubscriberDiscount && (
            <p className="text-[11px] text-muted-foreground">
              Professional subscribers pay ${subscriberPrice} per document.{" "}
              <Link to="/subscribe" className="text-primary font-semibold hover:underline">
                See what's included in Professional →
              </Link>
            </p>
          )}
          {showFreeForSubscribers && !isFreeForUser && (
            <p className="text-[11px] text-muted-foreground">
              Included with a Professional subscription.{" "}
              <Link to="/subscribe" className="text-primary font-semibold hover:underline">
                See plans →
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
