interface InFeedAdProps {
  adSlot?: string;
  googleAdClient?: string;
  googleAdSlot?: string;
}

export default function InFeedAd({ adSlot, googleAdClient, googleAdSlot }: InFeedAdProps) {
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
