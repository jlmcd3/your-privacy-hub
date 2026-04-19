import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Plus, X, Lock } from "lucide-react";
import { Link } from "react-router-dom";

const SUGGESTED = {
  jurisdictions: [
    { slug: "european-union", label: "European Union", flag: "🇪🇺" },
    { slug: "united-states",  label: "United States",  flag: "🇺🇸" },
    { slug: "united-kingdom", label: "United Kingdom", flag: "🇬🇧" },
    { slug: "france",         label: "France",         flag: "🇫🇷" },
    { slug: "india",          label: "India",          flag: "🇮🇳" },
    { slug: "china",          label: "China",          flag: "🇨🇳" },
    { slug: "australia",      label: "Australia",      flag: "🇦🇺" },
    { slug: "brazil",         label: "Brazil",         flag: "🇧🇷" },
  ],
  topics: [
    { slug: "ai-governance",    label: "AI Governance",    flag: "🤖" },
    { slug: "data-transfers",   label: "Data Transfers",   flag: "🌐" },
    { slug: "enforcement",      label: "Enforcement",      flag: "⚖️" },
    { slug: "children-privacy", label: "Children's Privacy",flag: "👶" },
    { slug: "biometric-data",   label: "Biometric Data",   flag: "🔍" },
    { slug: "adtech",           label: "AdTech & Consent", flag: "🍪" },
  ],
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
    const { data } = await (supabase as any)
      .from("user_watchlist")
      .insert({ user_id: user.id, type, slug, label, flag })
      .select()
      .single();
    if (data) setItems(prev => [...prev, data]);
  };

  const removeItem = async (id: string) => {
    await (supabase as any).from("user_watchlist").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  if (!isPremium) {
    return (
      <div className="bg-fog rounded-2xl p-6 text-center">
        <Lock className="w-8 h-8 text-slate mx-auto mb-3" />
        <h3 className="font-bold text-navy text-[15px] mb-2">Watchlist is a Professional feature</h3>
        <p className="text-slate text-sm mb-4">
          Follow specific jurisdictions, regulators, and topics to receive
          weekly digest updates on what changed.
        </p>
        <Link
          to="/subscribe"
          className="inline-block bg-gradient-to-br from-navy to-blue text-white font-semibold text-sm px-6 py-2.5 rounded-xl no-underline hover:opacity-90 transition-all"
        >
          Upgrade to Professional →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-blue" />
        <h2 className="font-bold text-navy text-[16px]">My Watchlist</h2>
        <span className="text-xs text-slate-light">· Alerts delivered in your weekly digest</span>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-1.5 bg-blue/5 text-navy border border-blue/20 px-3 py-1.5 rounded-full text-xs font-semibold"
            >
              {item.flag && <span>{item.flag}</span>}
              {item.label}
              <button
                onClick={() => removeItem(item.id)}
                className="ml-0.5 hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {items.length === 0 && !loading && (
        <p className="text-slate text-sm">
          You have nothing in your watchlist yet. Add items below.
        </p>
      )}

      {(["jurisdictions", "topics"] as const).map(type => (
        <div key={type}>
          <h3 className="font-bold text-navy text-xs uppercase tracking-widest mb-3 capitalize">
            {type === "jurisdictions" ? "🌐 Jurisdictions" : "📂 Topics"}
          </h3>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED[type].map(s => {
              const inList = items.some(i => i.slug === s.slug);
              return (
                <button
                  key={s.slug}
                  onClick={() => !inList && addItem(type.slice(0, -1), s.slug, s.label, s.flag)}
                  disabled={inList}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    inList
                      ? "bg-blue/10 text-blue border-blue/30 cursor-default"
                      : "bg-white text-slate border-fog hover:border-blue/30 hover:text-navy"
                  }`}
                >
                  {s.flag && <span>{s.flag}</span>}
                  {s.label}
                  {!inList && <Plus className="w-3 h-3" />}
                  {inList  && <span className="text-blue">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
