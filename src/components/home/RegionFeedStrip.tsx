import { normalizeTitle, stripHtml } from "@/lib/utils";

interface RegionItem {
  flag: string;
  jurisdiction: string;
  headline: string;
  category: string;
  href: string;
  date: string;
  whyItMatters?: string | null;
  urgency?: string | null;
  summary?: string | null;
}

interface RegionFeedStripProps {
  items: RegionItem[];
}

export default function RegionFeedStrip({ items }: RegionFeedStripProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {items.map((item, i) => {
        const isExternal = item.href.startsWith("http");
        const props = isExternal
          ? { href: item.href, target: "_blank" as const, rel: "noopener noreferrer" }
          : { href: item.href };

        return (
          <a
            key={i}
            {...props}
            className="bg-white rounded-xl border border-brand-cloud p-5 no-underline shadow-eup-sm hover:shadow-eup-md motion-safe:hover:-translate-y-0.5 transition-all motion-reduce:transition-shadow group"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl flag-emoji">{item.flag}</span>
              <div>
                <div className="text-meta font-bold text-slate uppercase tracking-wider">
                  {item.jurisdiction}
                </div>
                <div className="text-meta text-brand-mist">{item.date}</div>
              </div>
              <span className="ml-auto text-eyebrow bg-brand-teal/5 text-brand-teal-text border border-brand-teal/10 px-1.5 py-0.5 rounded-full">
                {item.category}
              </span>
            </div>
            <h4 className="font-bold text-brand-navy text-sm leading-snug group-hover:text-brand-teal-text transition-colors line-clamp-2">
              {normalizeTitle(item.headline)}
            </h4>
            {item.summary && (
              <p className="text-xs text-slate leading-snug mt-1 line-clamp-2">
                {stripHtml(item.summary)}
              </p>
            )}
            {item.whyItMatters && (
              <p className="text-meta text-muted-foreground leading-snug mt-1 line-clamp-2">
                {item.whyItMatters.split(/\.\s+/)[0] + "."}
              </p>
            )}
          </a>
        );
      })}
    </div>
  );
}
