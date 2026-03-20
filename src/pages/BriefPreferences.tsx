import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Topbar from "@/components/Topbar";

const INDUSTRIES = [
  { id: "online-web",      label: "Online & Web Services",          icon: "🌐" },
  { id: "mobile-apps",     label: "Mobile Applications",            icon: "📱" },
  { id: "adtech",          label: "AdTech & Digital Media",          icon: "📊" },
  { id: "ai-companies",    label: "AI & Machine Learning",          icon: "🤖" },
  { id: "healthcare",      label: "Healthcare & Life Sciences",     icon: "🏥" },
  { id: "financial",       label: "Financial Services & Fintech",   icon: "🏦" },
  { id: "hr-employment",   label: "HR & Employment Data",           icon: "👔" },
  { id: "children-edtech", label: "Children & EdTech",              icon: "👶" },
  { id: "retail-ecom",     label: "Retail & E-Commerce",            icon: "🛒" },
  { id: "data-brokers",    label: "Data Brokers",                   icon: "📂" },
  { id: "legal-services",  label: "Law Firm / Legal Services",      icon: "⚖️" },
  { id: "insurance",       label: "Insurance",                      icon: "🛡️" },
  { id: "telecom",         label: "Telecommunications",             icon: "📞" },
  { id: "gaming",          label: "Gaming & Entertainment",         icon: "🎮" },
  { id: "automotive",      label: "Automotive & Connected Vehicles",icon: "🚗" },
  { id: "smart-home",      label: "Smart Home & IoT",               icon: "🏠" },
  { id: "nonprofit",       label: "Non-Profit & NGO",               icon: "🤝" },
  { id: "media-publishing",label: "Media & Publishing",             icon: "📰" },
  { id: "government",      label: "Government & Public Sector",     icon: "🏛️" },
  { id: "cybersecurity",   label: "Cybersecurity",                  icon: "🔒" },
  { id: "real-estate",     label: "Real Estate & PropTech",         icon: "🏘️" },
  { id: "education",       label: "Education (Higher Ed)",          icon: "🎓" },
  { id: "consulting",      label: "Consulting & Advisory",          icon: "💼" },
  { id: "pharma",          label: "Pharma & Clinical Research",     icon: "💊" },
];

const PREF_JURISDICTIONS = [
  { id: "eu-all",      label: "EU (All Member States)",  icon: "🇪🇺" },
  { id: "uk",          label: "United Kingdom",           icon: "🇬🇧" },
  { id: "us-federal",  label: "U.S. Federal",             icon: "🇺🇸" },
  { id: "us-ca",       label: "U.S. — California (CPRA)", icon: "🍊" },
  { id: "us-states",   label: "U.S. States (all)",        icon: "🗺️" },
  { id: "apac",        label: "Asia-Pacific",             icon: "🌏" },
  { id: "latam",       label: "Latin America",            icon: "🌎" },
  { id: "mea",         label: "Middle East & Africa",     icon: "🌍" },
  { id: "canada",      label: "Canada",                   icon: "🇨🇦" },
  { id: "australia",   label: "Australia & NZ",           icon: "🇦🇺" },
  { id: "india",       label: "India (DPDP Act)",         icon: "🇮🇳" },
  { id: "global",      label: "Global / Multinational",   icon: "🌐" },
];

const TOPICS = [
  { id: "enforcement",      label: "Enforcement Actions",             icon: "⚖️" },
  { id: "ai-governance",    label: "AI Act & Governance",             icon: "🤖" },
  { id: "data-transfers",   label: "Cross-Border Transfers",          icon: "🔀" },
  { id: "biometric",        label: "Biometric Data",                  icon: "👁️" },
  { id: "children-privacy", label: "Children's Privacy (COPPA/KOSA)", icon: "👶" },
  { id: "data-breaches",    label: "Data Breaches & Incidents",       icon: "🔓" },
  { id: "adtech-consent",   label: "AdTech & Cookie Consent",         icon: "🍪" },
  { id: "litigation",       label: "Privacy Litigation & Class Actions", icon: "🏛️" },
  { id: "health-data",      label: "Health & Medical Data",           icon: "🩺" },
  { id: "employee-data",    label: "Employee & HR Data",              icon: "👨‍💼" },
  { id: "data-broker-reg",  label: "Data Broker Regulation",          icon: "📂" },
  { id: "eu-ai-act",        label: "EU AI Act Compliance",            icon: "🇪🇺" },
  { id: "us-state-law",     label: "US State Law Compliance",         icon: "🗺️" },
  { id: "gdpr-enforcement", label: "GDPR Enforcement",                icon: "🇪🇺" },
  { id: "open-banking",     label: "Open Banking & Financial Data",   icon: "🏦" },
  { id: "surveillance",     label: "Surveillance & Government Access", icon: "🔍" },
];

const BRIEF_FORMATS = [
  { id: "full",       label: "Full 9-section brief",    icon: "📄" },
  { id: "exec-only",  label: "Executive summary only",  icon: "⚡" },
  { id: "actions-only", label: "Action items only",      icon: "🎯" },
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
  const [prefs, setPrefs] = useState({ industries: [] as string[], jurisdictions: [] as string[], topics: [] as string[], format: "full" });
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
        if (data) setPrefs({
          industries: data.industries ?? [],
          jurisdictions: data.jurisdictions ?? [],
          topics: data.topics ?? [],
          format: data.format ?? "full",
        });
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
      <Helmet><title>Configure Your Analyst | EndUserPrivacy Premium Pro</title></Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <Topbar /><Navbar />
        <main className="flex-1 max-w-[860px] mx-auto px-4 md:px-8 py-10 w-full">
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 text-blue text-xs font-bold uppercase tracking-widest mb-3">
              <span>⭐</span> Premium Pro
            </div>
            <h1 className="font-display font-bold text-navy text-[24px] mb-2">
              Configure your analyst
            </h1>
            <p className="text-slate text-[14px] mb-8 max-w-lg">
              Your Pro brief is written by AI specifically for your regulatory
              environment. The more context you provide, the more precisely it
              speaks to your actual compliance obligations.
            </p>
          </div>

          {/* Industries */}
          <div className="mb-8">
            <h2 className="font-bold text-navy text-[15px] mb-1">Your sector</h2>
            <p className="text-slate text-xs mb-4">Select all that apply to your organization.</p>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map(i => (
                <Toggle key={i.id} {...i} selected={prefs.industries.includes(i.id)} onToggle={id => toggle("industries", id)} />
              ))}
            </div>
          </div>

          {/* Jurisdictions */}
          <div className="mb-8">
            <h2 className="font-bold text-navy text-[15px] mb-1">Your regulatory geography</h2>
            <p className="text-slate text-xs mb-4">Which regions are most relevant to your compliance footprint?</p>
            <div className="flex flex-wrap gap-2">
              {PREF_JURISDICTIONS.map(j => (
                <Toggle key={j.id} {...j} selected={prefs.jurisdictions.includes(j.id)} onToggle={id => toggle("jurisdictions", id)} />
              ))}
            </div>
          </div>

          {/* Topics */}
          <div className="mb-8">
            <h2 className="font-bold text-navy text-[15px] mb-1">Your compliance priorities</h2>
            <p className="text-slate text-xs mb-4">Tell your analyst which areas to prioritize in your brief.</p>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map(t => (
                <Toggle key={t.id} {...t} selected={prefs.topics.includes(t.id)} onToggle={id => toggle("topics", id)} />
              ))}
            </div>
          </div>

          {/* Brief format */}
          <div className="mb-8">
            <h2 className="font-bold text-navy text-[15px] mb-1">Your brief format</h2>
            <p className="text-slate text-xs mb-4">How would you like to receive your brief?</p>
            <div className="flex flex-wrap gap-2">
              {BRIEF_FORMATS.map(f => (
                <button
                  key={f.id}
                  onClick={() => { setPrefs(prev => ({ ...prev, format: f.id })); setSaved(false); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                    prefs.format === f.id
                      ? "bg-navy text-white border-navy shadow-eup-sm"
                      : "bg-white text-slate border-fog hover:border-navy/30 hover:text-navy"
                  }`}
                >
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                  {prefs.format === f.id && <span className="text-xs ml-0.5 opacity-70">✓</span>}
                </button>
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
              Your analyst's focus updates with the next Monday brief.
            </p>
          </div>

          {/* Upgrade prompt */}
          <div className="mt-8 bg-fog rounded-2xl p-6 text-center">
            <p className="text-slate text-sm mb-3">
              Your analyst requires Premium Pro ($20/month).
              Standard Premium subscribers receive the shared weekly brief.
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
