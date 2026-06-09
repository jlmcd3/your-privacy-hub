import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Plus, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  INDUSTRIES,
  JURISDICTIONS,
  TOPICS,
  ROLES,
  BRIEF_FORMATS,
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
  // Single-select choices — stored separately from the watchlist multi-selects.
  // role -> profiles.brief_role, format -> user_brief_preferences.format.
  const [role, setRole] = useState<string>("");
  const [format, setFormat] = useState<string>("full");

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("user_watchlist")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }: any) => { setItems(data ?? []); setLoading(false); });

    supabase
      .from("profiles")
      .select("brief_role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.brief_role) setRole(data.brief_role);
      });

    (supabase as any)
      .from("user_brief_preferences")
      .select("format")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.format) setFormat(data.format);
      });
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

  const selectRole = async (id: string) => {
    if (!user) return;
    const next = role === id ? "" : id;
    setRole(next);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ brief_role: next || null })
      .eq("id", user.id);
    if (error) toast.error("Couldn't save role");
  };

  const selectFormat = async (id: string) => {
    if (!user) return;
    setFormat(id);
    const { error } = await (supabase as any)
      .from("user_brief_preferences")
      .upsert(
        { user_id: user.id, format: id, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) toast.error("Couldn't save report format");
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

      {items.length === 0 && !loading && !role && (
        <p className="text-slate text-sm">
          You have nothing in your watchlist yet. Click items below to start following them.
        </p>
      )}

      {/* Role — single select (writes to profiles.brief_role) */}
      <div>
        <h3 className="text-brand-navy uppercase tracking-widest mb-3">
          👤 Your Role
        </h3>
        <p className="text-slate text-xs mb-3">Pick the one that fits best. Shapes how your brief and AI prompts are written.</p>
        <div className="flex flex-wrap gap-2">
          {ROLES.map(r => {
            const selected = role === r.id;
            return (
              <button
                key={r.id}
                onClick={() => selectRole(r.id)}
                title={selected ? "Click again to clear" : "Click to select this role"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  selected
                    ? "bg-brand-teal/10 text-brand-teal border-brand-teal/30 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                    : "bg-white text-slate border-brand-cloud hover:border-brand-teal/30 hover:text-brand-navy"
                }`}
              >
                <span>{r.icon}</span>
                {r.label}
                {!selected && <Plus className="w-3 h-3" />}
                {selected && <span>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

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

      {/* Report format — single select (writes to user_brief_preferences.format) */}
      <div>
        <h3 className="text-brand-navy uppercase tracking-widest mb-3">
          📄 Report Format
        </h3>
        <p className="text-slate text-xs mb-3">How your weekly Privacy Intelligence Report is structured.</p>
        <div className="flex flex-wrap gap-2">
          {BRIEF_FORMATS.map(f => {
            const selected = format === f.id;
            return (
              <button
                key={f.id}
                onClick={() => selectFormat(f.id)}
                title="Click to choose this format"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  selected
                    ? "bg-brand-teal/10 text-brand-teal border-brand-teal/30"
                    : "bg-white text-slate border-brand-cloud hover:border-brand-teal/30 hover:text-brand-navy"
                }`}
              >
                <span>{f.icon}</span>
                {f.label}
                {selected && <span>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
