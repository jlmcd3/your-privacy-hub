import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Topbar from "@/components/Topbar";

const INDUSTRIES = [
  { id: "online-web",      label: "Online & Web Businesses",  icon: "🌐" },
  { id: "mobile-apps",     label: "Mobile Applications",       icon: "📱" },
  { id: "adtech",          label: "Mobile Advertising / AdTech",icon: "📊" },
  { id: "ai-companies",    label: "AI & Technology",           icon: "🤖" },
  { id: "healthcare",      label: "Healthcare / HIPAA",        icon: "🏥" },
  { id: "financial",       label: "Financial Services",        icon: "🏦" },
  { id: "hr-employment",   label: "HR & Employment",           icon: "👔" },
  { id: "children-edtech", label: "Children's / EdTech",       icon: "👶" },
  { id: "retail-ecom",     label: "Retail & E-Commerce",       icon: "🛒" },
  { id: "data-brokers",    label: "Data Brokers",              icon: "📂" },
];

const PREF_JURISDICTIONS = [
  { id: "eu-uk",        label: "EU & UK (GDPR)",         icon: "🇪🇺" },
  { id: "us-federal",   label: "U.S. Federal",           icon: "🇺🇸" },
  { id: "us-states",    label: "U.S. States",            icon: "🗺️" },
  { id: "apac",         label: "Asia-Pacific",           icon: "🌏" },
  { id: "latam",        label: "Latin America",          icon: "🌎" },
  { id: "mea",          label: "Middle East & Africa",   icon: "🌍" },
  { id: "global",       label: "Global / Other",         icon: "🌐" },
];

const TOPICS = [
  { id: "enforcement",      label: "Enforcement Actions",      icon: "⚖️" },
  { id: "ai-governance",    label: "AI Governance",            icon: "🤖" },
  { id: "data-transfers",   label: "Cross-Border Transfers",   icon: "🔀" },
  { id: "biometric",        label: "Biometric Data",           icon: "👁️" },
  { id: "children-privacy", label: "Children's Privacy",       icon: "👶" },
  { id: "data-breaches",    label: "Data Breaches",            icon: "🔓" },
  { id: "adtech-consent",   label: "AdTech & Consent",         icon: "🍪" },
  { id: "litigation",       label: "Privacy Litigation",       icon: "🏛️" },
];

const Toggle = ({
  id, label, icon, selected, onToggle,
}: { id: string; label: string; icon: string; selected: boolean; onToggle: (id: string) => void }) => (
  <button
    onClick={() => onToggle(id)}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
      selected
        ? "bg-navy text-white border-navy shadow-eup-sm"
        : "bg-white text-slate border-fog hover:border-navy/30 hover:text-navy"
    }`}
  >
    <span>{icon}</span>
    <span>{label}</span>
    {selected && <span className="text-xs ml-0.5 opacity-70">✓</span>}
  </button>
);

export default function BriefPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState({ industries: [] as string[], jurisdictions: [] as string[], topics: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("user_brief_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }: any) => {
        if (data) setPrefs({ industries: data.industries ?? [], jurisdictions: data.jurisdictions ?? [], topics: data.topics ?? [] });
      });
  }, [user]);

  const toggle = (field: "industries" | "jurisdictions" | "topics", id: string) => {
    setPrefs(prev => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter(x => x !== id)
        : [...prev[field], id],
    }));
    setSaved(false);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    await (supabase as any)
      .from("user_brief_preferences")
      .upsert({ user_id: user.id, ...prefs, updated_at: new Date().toISOString() });
    setSaving(false);
    setSaved(true);
  };

  return (
    <>
      <Helmet><title>Customize Your Brief | EndUserPrivacy Premium Pro</title></Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <Topbar /><Navbar />
        <main className="flex-1 max-w-[860px] mx-auto px-4 md:px-8 py-10 w-full">
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 text-blue text-xs font-bold uppercase tracking-widest mb-3">
              <span>⭐</span> Premium Pro
            </div>
            <h1 className="font-display font-bold text-navy text-2xl md:text-3xl mb-2">
              Customize Your Weekly Brief
            </h1>
            <p className="text-slate text-sm max-w-xl">
              Select the industries, jurisdictions, and topics that matter most to your
              organization. Your brief will include a personalized "Your Focus" section
              every Monday in addition to the standard intelligence brief.
            </p>
          </div>

          {/* Industries */}
          <div className="mb-8">
            <h2 className="font-bold text-navy text-[15px] mb-1">Your Industry</h2>
            <p className="text-slate text-xs mb-4">Select all that apply to your organization.</p>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map(i => (
                <Toggle key={i.id} {...i} selected={prefs.industries.includes(i.id)} onToggle={id => toggle("industries", id)} />
              ))}
            </div>
          </div>

          {/* Jurisdictions */}
          <div className="mb-8">
            <h2 className="font-bold text-navy text-[15px] mb-1">Priority Jurisdictions</h2>
            <p className="text-slate text-xs mb-4">Which regions are most relevant to your compliance footprint?</p>
            <div className="flex flex-wrap gap-2">
              {PREF_JURISDICTIONS.map(j => (
                <Toggle key={j.id} {...j} selected={prefs.jurisdictions.includes(j.id)} onToggle={id => toggle("jurisdictions", id)} />
              ))}
            </div>
          </div>

          {/* Topics */}
          <div className="mb-8">
            <h2 className="font-bold text-navy text-[15px] mb-1">Subject-Matter Focus</h2>
            <p className="text-slate text-xs mb-4">Prioritize specific compliance areas in your brief.</p>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map(t => (
                <Toggle key={t.id} {...t} selected={prefs.topics.includes(t.id)} onToggle={id => toggle("topics", id)} />
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-4 pt-4 border-t border-fog">
            <button
              onClick={save}
              disabled={saving}
              className="bg-gradient-to-br from-navy to-blue text-white font-semibold text-sm px-8 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer border-none"
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save Preferences →"}
            </button>
            <p className="text-slate text-xs">
              Your preferences take effect with the next Monday brief.
            </p>
          </div>

          {/* Upgrade prompt */}
          <div className="mt-8 bg-fog rounded-2xl p-6 text-center">
            <p className="text-slate text-sm mb-3">
              Customized briefs require Premium Pro ($25/month).
              Standard Premium subscribers see the shared weekly brief.
            </p>
            <Link
              to="/subscribe"
              className="inline-block bg-gradient-to-br from-navy to-blue text-white font-semibold text-sm px-6 py-2.5 rounded-xl no-underline hover:opacity-90 transition-all"
            >
              Upgrade to Premium Pro →
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
