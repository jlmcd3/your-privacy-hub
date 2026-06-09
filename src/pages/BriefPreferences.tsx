import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import WorkspaceLayout from "@/components/dashboard/WorkspaceLayout";
import { FlagIcon } from "@/components/FlagIcon";
import { INTELLIGENCE_PRICING } from "@/config/pricing";
import {
  INDUSTRIES,
  JURISDICTIONS as PREF_JURISDICTIONS,
  TOPICS,
} from "@/config/briefTaxonomy";

const ROLES = [
  { id: "general_counsel", label: "General Counsel / CLO", icon: "⚖️" },
  { id: "cpo_dpo", label: "CPO / DPO / Privacy Officer", icon: "🛡️" },
  { id: "privacy_counsel", label: "Privacy / Product Counsel", icon: "📋" },
  { id: "privacy_ops", label: "Privacy Operations / Compliance", icon: "⚙️" },
  { id: "ciso_security", label: "CISO / Security Leader", icon: "🔒" },
  { id: "outside_counsel", label: "Outside Counsel / Consultant", icon: "🏛️" },
  { id: "policy_affairs", label: "Public Policy / Regulatory Affairs", icon: "📣" },
];

// INDUSTRIES, PREF_JURISDICTIONS, and TOPICS are imported from
// @/config/briefTaxonomy — the single source of truth shared with the
// /watchlist surface.

const BRIEF_FORMATS = [
  { id: "full", label: "Full 9-section report", icon: "📄" },
  { id: "exec-only", label: "Executive summary only", icon: "⚡" },
  { id: "actions-only", label: "Action items only", icon: "🎯" },
];

const Toggle = ({
  id,
  label,
  icon,
  description,
  selected,
  onToggle,
}: {
  id: string;
  label: string;
  icon: string;
  description?: string;
  selected: boolean;
  onToggle: (id: string) => void;
}) => (
  <button
    type="button"
    onClick={() => onToggle(id)}
    className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-left w-full transition-all cursor-pointer ${
      selected
        ? "bg-brand-navy text-white border-brand-navy shadow-eup-sm"
        : "bg-white text-slate border-brand-cloud hover:border-brand-navy/30 hover:text-brand-navy"
    }`}
  >
    <span className="text-lg flex-shrink-0 mt-0.5"><FlagIcon icon={icon} /></span>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-semibold leading-tight ${selected ? "text-white" : "text-brand-navy"}`}>{label}</p>
      {description && (
        <p className={`text-meta mt-0.5 leading-snug ${selected ? "text-blue-200" : "text-slate"}`}>{description}</p>
      )}
    </div>
    {selected && <span className="text-xs ml-auto flex-shrink-0 mt-0.5 opacity-70">✓</span>}
  </button>
);

export default function BriefPreferences() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromSubscribe = searchParams.get("from") === "subscribe";
  const [prefs, setPrefs] = useState({
    industries: [] as string[],
    jurisdictions: [] as string[],
    topics: [] as string[],
    format: "full",
  });
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  // Build label/flag lookup once so we can persist watchlist rows with
  // the same display metadata the watchlist UI uses.
  const TAXONOMY_LOOKUP: Record<string, { type: string; label: string; flag: string }> = {};
  INDUSTRIES.forEach(i => { TAXONOMY_LOOKUP[i.id] = { type: "industry", label: i.label, flag: i.icon }; });
  PREF_JURISDICTIONS.forEach(j => { TAXONOMY_LOOKUP[j.id] = { type: "jurisdiction", label: j.label, flag: j.icon }; });
  TOPICS.forEach(t => { TAXONOMY_LOOKUP[t.id] = { type: "topic", label: t.label, flag: t.icon }; });

  useEffect(() => {
    if (!user) return;
    // Industries / jurisdictions / topics now live in user_watchlist —
    // the single source of truth shared with /watchlist and the AI prompt.
    (supabase as any)
      .from("user_watchlist")
      .select("type, slug")
      .eq("user_id", user.id)
      .then(({ data }: any) => {
        const rows = (data ?? []) as Array<{ type: string; slug: string }>;
        setPrefs(prev => ({
          ...prev,
          industries:    rows.filter(r => r.type === "industry").map(r => r.slug),
          jurisdictions: rows.filter(r => r.type === "jurisdiction").map(r => r.slug),
          topics:        rows.filter(r => r.type === "topic").map(r => r.slug),
        }));
      });

    // Format still lives in user_brief_preferences (it isn't a watchlist item).
    (supabase as any)
      .from("user_brief_preferences")
      .select("format")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.format) setPrefs(prev => ({ ...prev, format: data.format }));
      });

    // Role from profile
    supabase
      .from("profiles")
      .select("brief_role, is_premium")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          if ((data as any).brief_role) setRole((data as any).brief_role);
          setIsPremium(data.is_premium ?? false);
        }
      });
  }, [user]);

  const toggle = (field: "industries" | "jurisdictions" | "topics", id: string) => {
    setPrefs((prev) => ({
      ...prev,
      [field]: prev[field].includes(id) ? prev[field].filter((x) => x !== id) : [...prev[field], id],
    }));
    setSaved(false);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);

    // 1. Reconcile watchlist rows for the three taxonomy fields.
    const { data: existing } = await (supabase as any)
      .from("user_watchlist")
      .select("id, type, slug")
      .eq("user_id", user.id)
      .in("type", ["industry", "jurisdiction", "topic"]);

    const existingRows = (existing ?? []) as Array<{ id: string; type: string; slug: string }>;
    const existingKey = new Set(existingRows.map(r => `${r.type}:${r.slug}`));

    const desired: Array<{ type: string; slug: string }> = [
      ...prefs.industries.map(slug => ({ type: "industry", slug })),
      ...prefs.jurisdictions.map(slug => ({ type: "jurisdiction", slug })),
      ...prefs.topics.map(slug => ({ type: "topic", slug })),
    ];
    const desiredKey = new Set(desired.map(d => `${d.type}:${d.slug}`));

    const toInsert = desired
      .filter(d => !existingKey.has(`${d.type}:${d.slug}`))
      .map(d => {
        const meta = TAXONOMY_LOOKUP[d.slug];
        return {
          user_id: user.id,
          type: d.type,
          slug: d.slug,
          label: meta?.label ?? d.slug,
          flag:  meta?.flag  ?? null,
        };
      });
    const idsToDelete = existingRows
      .filter(r => !desiredKey.has(`${r.type}:${r.slug}`))
      .map(r => r.id);

    await Promise.all([
      toInsert.length
        ? (supabase as any).from("user_watchlist").insert(toInsert)
        : Promise.resolve(),
      idsToDelete.length
        ? (supabase as any).from("user_watchlist").delete().in("id", idsToDelete)
        : Promise.resolve(),
      // 2. Format still goes to user_brief_preferences.
      (supabase as any)
        .from("user_brief_preferences")
        .upsert(
          { user_id: user.id, format: prefs.format, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        ),
      // 3. Role to profile.
      role
        ? supabase.from("profiles").update({ brief_role: role } as any).eq("id", user.id)
        : Promise.resolve(),
    ]);

    setSaving(false);
    setSaved(true);
    if (!isPremium) {
      toast("Preferences saved! They'll activate when you get Intelligence.");
    } else {
      toast.success("Preferences saved!");
    }
    setTimeout(() => navigate("/dashboard"), 800);
  };


  return (
    <>
      <Helmet>
        <title>Configure Your Privacy Intelligence Report | End User Privacy Intelligence</title>
      </Helmet>
      <WorkspaceLayout className="bg-background">
        <main className="flex-1 max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          {fromSubscribe && (
            <div className="mb-8 bg-gradient-to-r from-brand-navy to-brand-steel rounded-2xl p-5 text-white">
              <p className="text-eyebrow text-amber-400 mb-1">
                ⭐ Welcome to Intelligence
              </p>
              <p className="font-display font-bold text-lg mb-1">
                Set your preferences to get your first Privacy Intelligence Report
              </p>
              <p className="text-blue-200 text-sm">
                Your Privacy Intelligence Report is written specifically for your industry and jurisdictions. The form below takes 60 seconds
                — your first Privacy Intelligence Report arrives Monday.
              </p>
            </div>
          )}
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 text-brand-teal text-xs font-bold uppercase tracking-widest mb-3">
              <span>⭐</span> Intelligence
            </div>
            <h1 className="font-display text-brand-navy mb-2">Configure your Privacy Intelligence Report</h1>
            <p className="text-slate text-sm mb-3 max-w-lg">
              Your Privacy Intelligence Report is created specifically for your regulatory environment. The more context you
              provide, the more precisely it speaks to your actual compliance obligations.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 max-w-lg">
              <p className="text-meta text-brand-navy leading-snug">
                <span className="font-semibold">These preferences apply to your next scheduled report.</span>{" "}
                Already-published reports in your archive remain unchanged.
              </p>
            </div>
          </div>

          {/* Role */}
          <div className="mb-8">
            <h2 className="text-brand-navy text-[15px] mb-1">Your role</h2>
            <p className="text-slate text-xs mb-4">Your report is shaped by how you use regulatory intelligence.</p>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setRole(r.id);
                    setSaved(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                    role === r.id
                      ? "bg-brand-navy text-white border-brand-navy shadow-eup-sm"
                      : "bg-white text-slate border-brand-cloud hover:border-brand-navy/30 hover:text-brand-navy"
                  }`}
                >
                  <span><FlagIcon icon={r.icon} /></span>
                  <span>{r.label}</span>
                  {role === r.id && <span className="text-xs ml-0.5 opacity-70">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Industries */}
          <div className="mb-8">
            <h2 className="text-brand-navy text-[15px] mb-1">Your sector</h2>
            <p className="text-slate text-xs mb-4">Select all that apply to your organization.</p>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((i) => (
                <Toggle
                  key={i.id}
                  {...i}
                  selected={prefs.industries.includes(i.id)}
                  onToggle={(id) => toggle("industries", id)}
                />
              ))}
            </div>
          </div>

          {/* Jurisdictions */}
          <div className="mb-8">
            <h2 className="text-brand-navy text-[15px] mb-1">Your regulatory geography</h2>
            <p className="text-slate text-xs mb-4">Which regions are most relevant to your compliance footprint?</p>
            <div className="flex flex-wrap gap-2">
              {PREF_JURISDICTIONS.map((j) => (
                <Toggle
                  key={j.id}
                  {...j}
                  selected={prefs.jurisdictions.includes(j.id)}
                  onToggle={(id) => toggle("jurisdictions", id)}
                />
              ))}
            </div>
          </div>

          {/* Brief format */}
          <div className="mb-8">
            <h2 className="text-brand-navy text-[15px] mb-1">Your report format</h2>
            <p className="text-slate text-xs mb-4">How would you like to receive your report?</p>
            <div className="flex flex-wrap gap-2">
              {BRIEF_FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setPrefs((prev) => ({ ...prev, format: f.id }));
                    setSaved(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                    prefs.format === f.id
                      ? "bg-brand-navy text-white border-brand-navy shadow-eup-sm"
                      : "bg-white text-slate border-brand-cloud hover:border-brand-navy/30 hover:text-brand-navy"
                  }`}
                >
                  <span><FlagIcon icon={f.icon} /></span>
                  <span>{f.label}</span>
                  {prefs.format === f.id && <span className="text-xs ml-0.5 opacity-70">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {isPremium === false && (
            <div className="mt-6 mb-4 bg-brand-cloud rounded-2xl p-6 text-center">
              <p className="text-slate text-sm mb-3">
                Intelligence requires a subscription ({`${INTELLIGENCE_PRICING.monthly()}`}). Preferences are saved and
                will activate once you subscribe.
              </p>
              <Link
                to="/subscribe"
                className="inline-block bg-gradient-to-br from-brand-navy to-brand-teal text-white font-semibold text-sm px-6 py-2.5 rounded-xl no-underline hover:opacity-90 transition-all"
              >
                Get Intelligence →
              </Link>
            </div>
          )}

          {/* Save */}
          <div className="flex items-center gap-4 pt-4 border-t border-brand-cloud">
            <button
              onClick={save}
              disabled={saving}
              className="bg-gradient-to-br from-brand-navy to-brand-teal text-white font-semibold text-sm px-8 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer border-none"
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save Preferences →"}
            </button>
            <p className="text-slate text-xs">Saved preferences take effect with the next Monday report.</p>
          </div>
        </main>
      </WorkspaceLayout>
    </>
  );
}
