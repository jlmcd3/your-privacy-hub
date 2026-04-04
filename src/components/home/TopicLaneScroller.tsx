import { Link } from "react-router-dom";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArticleCard, type ArticleItem } from "@/components/ArticleCard";

interface TopicLaneScrollerProps {
  laneTitle: string;
  laneIcon: string;
  laneHref: string;
  cards: ArticleItem[];
  isEnforcement?: boolean;
}

export default function TopicLaneScroller({
  laneTitle,
  laneIcon,
  laneHref,
  cards,
  isEnforcement = false,
}: TopicLaneScrollerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 280 : -280, behavior: "smooth" });
  };

  return (
    <div className={`mb-10 ${isEnforcement ? "bg-amber-50/60 rounded-2xl px-4 py-5 -mx-4" : ""}`}>
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
        {cards.filter((card, i, arr) => arr.findIndex(c => c.id === card.id) === i).map((card, i) => (
          <div
            key={card.id + '-' + i}
            className={`flex-shrink-0 w-[230px] sm:w-[250px] bg-white rounded-xl border border-fog p-3 hover:shadow-eup-sm hover:-translate-y-0.5 transition-all ${isEnforcement ? "border-l-[3px] border-l-amber-500" : ""}`}
          >
            <ArticleCard item={card} variant="compact" />
          </div>
        ))}
      </div>
    </div>
  );
}
