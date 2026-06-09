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
  // Canonical topic list — kept in sync with TOPICS in src/pages/BriefPreferences.tsx
  // so that what users follow on /watchlist matches what they can select for
  // their weekly brief. Slugs MUST match BriefPreferences ids.
  topics: [
    { slug: "us-state-laws",       label: "US State Privacy Laws",                  flag: "🗺️" },
    { slug: "gdpr-enforcement",    label: "GDPR Enforcement & DPA Activity",        flag: "🇪🇺" },
    { slug: "ai-act-compliance",   label: "EU AI Act Compliance",                   flag: "🤖" },
    { slug: "children-privacy",    label: "Children's Privacy & Age Verification",  flag: "👶" },
    { slug: "adtech-consent",      label: "AdTech, Consent & Cookie Compliance",    flag: "🍪" },
    { slug: "data-transfers",      label: "Cross-Border Data Transfers",            flag: "🔀" },
    { slug: "health-data",         label: "Health & Medical Data Privacy",          flag: "🏥" },
    { slug: "privacy-litigation",  label: "Privacy Litigation & Class Actions",     flag: "🏛️" },
    { slug: "biometric-data",      label: "Biometric Data Privacy",                 flag: "👁️" },
    { slug: "data-breach-response",label: "Data Breach & Incident Response",        flag: "🔓" },
  ],
  industries: [
    { slug: "sec-healthcare",      label: "Healthcare & Life Sciences",     flag: "🏥" },
    { slug: "sec-financial",       label: "Financial Services & Fintech",   flag: "🏦" },
    { slug: "sec-adtech",          label: "AdTech & Digital Media",         flag: "📊" },
    { slug: "sec-ai-companies",    label: "AI & Machine Learning",          flag: "🤖" },
    { slug: "sec-children-edtech", label: "Children & EdTech",              flag: "👶" },
    { slug: "sec-data-brokers",    label: "Data Brokers",                   flag: "📂" },
    { slug: "sec-retail-ecom",     label: "Retail & E-Commerce",            flag: "🛒" },
    { slug: "sec-hr-employment",   label: "HR & Employment Data",           flag: "👔" },
    { slug: "sec-telecom",         label: "Telecommunications",             flag: "📞" },
    { slug: "sec-automotive",      label: "Automotive & Connected Vehicles",flag: "🚗" },
    { slug: "sec-government",      label: "Government & Public Sector",     flag: "🏛️" },
    { slug: "sec-pharma",          label: "Pharma & Clinical Research",     flag: "💊" },
  ],
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
        <span className="text-xs text-brand-mist">· Alerts delivered in your weekly digest</span>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-1.5 bg-brand-teal/5 text-brand-navy border border-brand-teal/20 px-3 py-1.5 rounded-full text-xs font-semibold"
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

      {(["jurisdictions", "topics", "industries"] as const).map(type => (
        <div key={type}>
          <h3 className="text-brand-navy uppercase tracking-widest mb-3">
            {SECTION_HEADINGS[type]}
          </h3>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED[type].map(s => {
              const inList = items.some(i => i.slug === s.slug);
              return (
                <button
                  key={s.slug}
                  onClick={() => !inList && addItem(TYPE_FOR_KEY[type], s.slug, s.label, s.flag)}
                  disabled={inList}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    inList
                      ? "bg-brand-teal/10 text-brand-teal border-brand-teal/30 cursor-default"
                      : "bg-white text-slate border-brand-cloud hover:border-brand-teal/30 hover:text-brand-navy"
                  }`}
                >
                  {s.flag && <span>{s.flag}</span>}
                  {s.label}
                  {!inList && <Plus className="w-3 h-3" />}
                  {inList  && <span className="text-brand-teal">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
