import { Link } from "react-router-dom";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function decodeHtml(html: string): string {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

interface TopicCard {
  title: string;
  badge?: string;
  excerpt: string;
  jurisdiction?: string;
  flag?: string;
  href: string;
  date?: string;
  urgency?: string | null;
  whyItMatters?: string | null;
}

interface TopicLaneScrollerProps {
  laneTitle: string;
  laneIcon: string;
  laneHref: string;
  cards: TopicCard[];
}

export default function TopicLaneScroller({
  laneTitle,
  laneIcon,
  laneHref,
  cards,
}: TopicLaneScrollerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 280 : -280, behavior: "smooth" });
  };

  return (
    <div className="mb-10">
      {/* Lane header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg flag-emoji">{laneIcon}</span>
          <h3 className="font-display font-bold text-navy text-[15px]">{laneTitle}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="w-7 h-7 rounded-full bg-fog flex items-center justify-center hover:bg-blue/10 transition-colors border-none cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-slate" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-7 h-7 rounded-full bg-fog flex items-center justify-center hover:bg-blue/10 transition-colors border-none cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-slate" />
          </button>
          <Link
            to={laneHref}
            className="text-blue text-xs font-semibold no-underline hover:underline ml-1"
          >
            See all →
          </Link>
        </div>
      </div>

      {/* Scrollable cards */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {cards.filter((card, i, arr) => arr.findIndex(c => c.title === card.title) === i).map((card, i) => (
          <a
            key={card.title + i}
            href={card.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-[250px] bg-white rounded-xl border border-fog p-4 no-underline hover:shadow-eup-sm hover:-translate-y-0.5 transition-all group"
          >
            <div className="flex items-center gap-1.5 mb-2">
              {card.flag && <span className="text-base flag-emoji">{card.flag}</span>}
              {card.jurisdiction && (
                <span className="text-[10px] font-semibold text-slate uppercase tracking-wide">
                  {card.jurisdiction}
                </span>
              )}
            {card.badge && (
                <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded-full">
                  {card.badge}
                </span>
              )}
              {!card.badge && card.urgency && card.urgency !== "Monitor" && (
                <span className={`ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                  card.urgency === "Immediate"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {card.urgency === "Immediate" ? "⚡ Act now" : "📅 This quarter"}
                </span>
              )}
            </div>
            <h4 className="font-bold text-navy text-[13px] leading-snug mb-1.5 group-hover:text-blue transition-colors">
              {card.title}
            </h4>
            <p className="text-slate text-[11px] leading-relaxed line-clamp-2">
              {card.whyItMatters
                ? card.whyItMatters.split(/\.\s+/)[0] + "."
                : decodeHtml(card.excerpt)}
            </p>
            {card.date && (
              <p className="text-slate-light text-[10px] mt-2">{card.date}</p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
