/**
 * ADVERTISING POLICY — EndUserPrivacy.com FRD v2.1 §8.3
 *
 * 1. Ads MUST NOT appear in any authenticated Premium workflow.
 *    Pass isPremium={true} to suppress this component entirely.
 *
 * 2. All ads served here MUST be contextual and non-behavioural.
 *    No user browsing data from this platform may be used for
 *    ad targeting or shared with ad networks.
 *
 * 3. This component is currently INACTIVE (returns null).
 *    Before activating, review against FRD §8.3.
 */

interface InFeedAdProps {
  adSlot?: string;
  googleAdClient?: string;
  googleAdSlot?: string;
  isPremium?: boolean;
}

export default function InFeedAd({ adSlot, googleAdClient, googleAdSlot, isPremium = false }: InFeedAdProps) {
  if (isPremium) return null; // Policy: never show ads to Premium users

  // Don't render placeholder when no real ad content is configured
  if (!googleAdClient || !googleAdSlot) return null;

  return (
    <div
      className="flex items-center justify-center bg-fog/40 border border-silver/60 rounded-xl my-1"
      style={{ minHeight: 90 }}
      data-ad-slot={adSlot}
      aria-label="Advertisement"
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", height: 90 }}
        data-ad-client={googleAdClient}
        data-ad-slot={googleAdSlot}
        data-ad-format="fluid"
        data-ad-layout="in-article"
      />
    </div>
  );
}
