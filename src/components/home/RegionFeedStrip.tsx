import { Link } from "react-router-dom";

interface RegionItem {
  flag: string;
  jurisdiction: string;
  headline: string;
  category: string;
  href: string;
  date: string;
}

interface RegionFeedStripProps {
  items: RegionItem[];
}

export default function RegionFeedStrip({ items }: RegionFeedStripProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {items.map((item, i) => (
        <Link
          key={i}
          to={item.href}
          className="bg-white rounded-xl border border-fog p-5 no-underline hover:shadow-eup-sm hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{item.flag}</span>
            <div>
              <div className="text-[10px] font-bold text-slate uppercase tracking-wider">
                {item.jurisdiction}
              </div>
              <div className="text-[10px] text-slate-light">{item.date}</div>
            </div>
            <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-blue/5 text-blue border border-blue/10 px-1.5 py-0.5 rounded-full">
              {item.category}
            </span>
          </div>
          <h4 className="font-bold text-navy text-[14px] leading-snug group-hover:text-blue transition-colors">
            {item.headline}
          </h4>
        </Link>
      ))}
    </div>
  );
}
