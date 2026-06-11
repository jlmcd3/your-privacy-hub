// CTA-2: compact product CTA chip used on article detail and weekly brief.
// PRICING RULE: never display price. The single allowed badge is
// "Included with your plan" — only when product.tierIncluded && active subscriber.

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Wrench } from "lucide-react";
import { PRODUCT_REGISTRY } from "@/lib/productRegistry";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { trackEvent } from "@/lib/trackEvent";

interface Props {
  slug: string;
  matchedTrigger?: string;
  placement: string;
}

export default function ProductCtaChip({ slug, matchedTrigger, placement }: Props) {
  const product = PRODUCT_REGISTRY.find((p) => p.slug === slug);
  const { hasToolAccess } = useSubscriptionTier();

  useEffect(() => {
    if (!product) return;
    trackEvent("cta_impression", { slug, placement, trigger: matchedTrigger });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, placement, matchedTrigger, product?.slug]);

  if (!product) return null;

  const showIncludedBadge = product.tierIncluded && hasToolAccess;

  return (
    <Link
      to={product.route}
      onClick={() =>
        trackEvent("cta_click", { slug, placement, trigger: matchedTrigger })
      }
      className="no-underline block border border-brand-cloud rounded-md bg-white hover:border-cobalt transition-colors px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <Wrench className="w-5 h-5 text-brand-teal shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-brand-navy">
              Related tool · {product.name}
            </span>
            {showIncludedBadge && (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-brand-teal/10 text-brand-teal border border-brand-teal/30">
                Included with your plan
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            {product.shortPitch}
          </p>
        </div>
        <span className="text-sm font-semibold text-cobalt shrink-0">
          Open →
        </span>
      </div>
    </Link>
  );
}
