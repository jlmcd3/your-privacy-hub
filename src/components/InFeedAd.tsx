interface InFeedAdProps {
  adSlot?: string;
  googleAdClient?: string;
  googleAdSlot?: string;
}

export default function InFeedAd({ adSlot, googleAdClient, googleAdSlot }: InFeedAdProps) {
  return (
    <div
      className="flex items-center justify-center bg-fog/40 border border-silver/60 rounded-xl my-1"
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
        <div className="flex flex-col items-center justify-center w-full h-full py-4 gap-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-light/70 select-none">
            Advertisement
          </span>
          <div className="w-full max-w-[728px] h-[90px] bg-fog/60 rounded-lg flex items-center justify-center">
            <span className="text-slate-light text-[11px] tracking-wider uppercase font-medium opacity-50 select-none">
              Sponsored Content
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
