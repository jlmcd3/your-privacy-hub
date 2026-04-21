/**
 * ADVERTISING POLICY — EndUserPrivacy.com FRD v2.1 §8.3
 *
 * 1. Ads are shown to ALL users including Professional subscribers.
 * 2. All ads served here MUST be contextual and non-behavioural.
 *    No user browsing data from this platform may be used for
 *    ad targeting or shared with ad networks.
 */

interface InFeedAdProps {
  adSlot?: string;
  googleAdClient?: string;
  googleAdSlot?: string;
}

export default function InFeedAd({ adSlot, googleAdClient, googleAdSlot }: InFeedAdProps) {
  return (
    <div
      className="flex items-center justify-center bg-fog/40 border border-silver/60 rounded-xl my-3"
      style={{ minHeight: 90 }}
      data-ad-slot={adSlot}
      aria-label="Advertisement"
    >
      {googleAdClient && googleAdSlot ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", height: 90 }}
          data-ad-client={googleAdClient}
          data-ad-slot={googleAdSlot}
          data-ad-format="fluid"
          data-ad-layout="in-article"
        />
      ) : (
        <span className="text-[10px] uppercase tracking-widest text-slate/60">
          Advertisement
        </span>
      )}
    </div>
  );
}
