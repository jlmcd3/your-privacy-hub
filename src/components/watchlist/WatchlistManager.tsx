import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Plus, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import {
  INDUSTRIES,
  JURISDICTIONS,
  TOPICS,
  type TaxonomyItem,
} from "@/config/briefTaxonomy";

// Map BriefPreferences taxonomy items to the {slug,label,flag} shape used by
// the watchlist chips. Using the same source as BriefPreferences guarantees
// that every option a user can pick for their weekly brief is also followable
// here, with identical identifiers feeding the AI prompt personalisation.
const toChip = (t: TaxonomyItem) => ({ slug: t.id, label: t.label, flag: t.icon });

const SUGGESTED = {
  jurisdictions: JURISDICTIONS.map(toChip),
  topics: TOPICS.map(toChip),
  industries: INDUSTRIES.map(toChip),
};

// Map watchlist type-key -> singular type stored in user_watchlist.type
const TYPE_FOR_KEY: Record<keyof typeof SUGGESTED, string> = {
  jurisdictions: "jurisdiction",
  topics: "topic",
  industries: "industry",
};

const SECTION_HEADINGS: Record<keyof typeof SUGGESTED, string> = {
  jurisdictions: "🌐 Jurisdictions",
  topics: "📂 Topics",
  industries: "🏭 Industries",
};

interface WatchItem { id: string; type: string; slug: string; label: string; flag?: string; }

export default function WatchlistManager({ isPremium }: { isPremium: boolean }) {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("user_watchlist")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }: any) => { setItems(data ?? []); setLoading(false); });
  }, [user]);

  const addItem = async (type: string, slug: string, label: string, flag?: string) => {
    if (!user || items.find(i => i.slug === slug)) return;
    // Upsert against the (user_id, type, slug) unique constraint so a
    // double-click or two open tabs can't create duplicate rows.
    const { data } = await (supabase as any)
      .from("user_watchlist")
      .upsert(
        { user_id: user.id, type, slug, label, flag },
        { onConflict: "user_id,type,slug", ignoreDuplicates: false }
      )
      .select()
      .single();
    if (data) setItems(prev => (prev.find(i => i.id === data.id) ? prev : [...prev, data]));
  };


  const removeItem = async (id: string) => {
    await (supabase as any).from("user_watchlist").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  if (!isPremium) {
    return (
      <div className="bg-brand-cloud rounded-2xl p-6 text-center">
        <Lock className="w-8 h-8 text-slate mx-auto mb-3" />
        <h3 className="text-brand-navy text-[15px] mb-2">Watchlist is an Intelligence feature</h3>
        <p className="text-slate text-sm mb-4">
          Follow specific jurisdictions, regulators, and topics to receive
          weekly digest updates on what changed.
        </p>
        <Link
          to="/subscribe"
          className="inline-block bg-gradient-to-br from-brand-navy to-brand-teal text-white font-semibold text-sm px-6 py-2.5 rounded-xl no-underline hover:opacity-90 transition-all"
        >
          Get Intelligence →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-brand-teal" />
        <h2 className="text-brand-navy text-[16px]">My Watchlist</h2>
        <span className="text-xs text-brand-mist">· Click any item below to add or remove. Selections power your weekly digest and AI prompts.</span>
      </div>

      {items.length === 0 && !loading && (
        <p className="text-slate text-sm">
          You have nothing in your watchlist yet. Click items below to start following them.
        </p>
      )}



      {(["jurisdictions", "topics", "industries"] as const).map(type => (
        <div key={type}>
          <h3 className="text-brand-navy uppercase tracking-widest mb-3">
            {SECTION_HEADINGS[type]}
          </h3>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED[type].map(s => {
              const existing = items.find(i => i.slug === s.slug);
              const inList = !!existing;
              return (
                <button
                  key={s.slug}
                  onClick={() =>
                    inList
                      ? removeItem(existing!.id)
                      : addItem(TYPE_FOR_KEY[type], s.slug, s.label, s.flag)
                  }
                  title={inList ? "Click to remove from your watchlist" : "Click to add to your watchlist"}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    inList
                      ? "bg-brand-teal/10 text-brand-teal border-brand-teal/30 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      : "bg-white text-slate border-brand-cloud hover:border-brand-teal/30 hover:text-brand-navy"
                  }`}
                >
                  {s.flag && <span>{s.flag}</span>}
                  {s.label}
                  {!inList && <Plus className="w-3 h-3" />}
                  {inList  && <span>✓</span>}
                </button>
              );
            })}

          </div>
        </div>
      ))}
    </div>
  );
}
