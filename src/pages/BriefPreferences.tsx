import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Topbar from "@/components/Topbar";

const ROLES = [
  { id: "general_counsel", label: "General Counsel / CLO", icon: "⚖️" },
  { id: "cpo_dpo", label: "CPO / DPO / Privacy Officer", icon: "🛡️" },
  { id: "privacy_counsel", label: "Privacy / Product Counsel", icon: "📋" },
  { id: "privacy_ops", label: "Privacy Operations / Compliance", icon: "⚙️" },
  { id: "ciso_security", label: "CISO / Security Leader", icon: "🔒" },
  { id: "outside_counsel", label: "Outside Counsel / Consultant", icon: "🏛️" },
  { id: "policy_affairs", label: "Public Policy / Regulatory Affairs", icon: "📣" },
];

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
  { id: "social_media",    label: "Social Media & Platforms",       icon: "📱" },
  { id: "travel_hospitality", label: "Travel & Hospitality",        icon: "✈️" },
  { id: "biotech_genomics", label: "Biotech & Genomics",            icon: "🧬" },
  { id: "energy_utilities", label: "Energy & Utilities",             icon: "⚡" },
  { id: "identity_kyc",    label: "Identity Verification & KYC",    icon: "🪪" },
  { id: "manufacturing_iot", label: "Manufacturing & Industrial IoT", icon: "🏭" },
  { id: "cpg_loyalty",     label: "Consumer Goods & Loyalty Programs", icon: "🛍️" },
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

const TOPICS: { id: string; label: string; icon: string; description: string }[] = [
  { id: "us-state-laws", label: "US State Privacy Laws", icon: "🗺️", description: "New state laws, AG enforcement, CPPA actions, and compliance deadlines across all 50 states" },
  { id: "gdpr-enforcement", label: "GDPR Enforcement & DPA Activity", icon: "🇪🇺", description: "DPA fines, EDPB binding decisions, cross-border enforcement, and legal precedent" },
  { id: "ai-act-compliance", label: "EU AI Act Compliance", icon: "🤖", description: "AI Act implementation phases, GPAI code updates, prohibited AI, and GDPR intersection" },
  { id: "children-privacy", label: "Children's Privacy & Age Verification", icon: "👶", description: "COPPA enforcement, KOSA developments, UK AADC, and platform-specific obligations" },
  { id: "adtech-consent", label: "AdTech, Consent & Cookie Compliance", icon: "🍪", description: "TCF updates, cookie enforcement actions, Privacy Sandbox changes, FTC surveillance rules" },
  { id: "data-transfers", label: "Cross-Border Data Transfers", icon: "🔀", description: "DPF status, SCC updates, LGPD transfers, APAC mechanisms, and Schrems litigation" },
  { id: "health-data", label: "Health & Medical Data Privacy", icon: "🏥", description: "HIPAA enforcement, FTC health data actions, state health laws, and health AI obligations" },
  { id: "privacy-litigation", label: "Privacy Litigation & Class Actions", icon: "🏛️", description: "BIPA filings, VPPA cases, CIPA wiretap suits, MDL proceedings, settlement watch" },
  { id: "biometric-data", label: "Biometric Data Privacy", icon: "👁️", description: "BIPA class action tracker, state biometric laws, AI Act biometric provisions" },
  { id: "data-breach-response", label: "Data Breach & Incident Response", icon: "🔓", description: "Breach notification law changes, SEC disclosure rules, enforcement for late reporting" },
];

const BRIEF_FORMATS = [
  { id: "full",       label: "Full 9-section brief",    icon: "📄" },
  { id: "exec-only",  label: "Executive summary only",  icon: "⚡" },
  { id: "actions-only", label: "Action items only",      icon: "🎯" },
];

const Toggle = ({
  id, label, icon, description, selected, onToggle,
}: { id: string; label: string; icon: string; description?: string; selected: boolean; onToggle: (id: string) => void }) => (
  <button
    type="button"
    onClick={() => onToggle(id)}
    className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-left w-full transition-all cursor-pointer ${
      selected
        ? "bg-navy text-white border-navy shadow-eup-sm"
        : "bg-white text-slate border-fog hover:border-navy/30 hover:text-navy"
    }`}
  >
    <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-semibold leading-tight ${selected ? "text-white" : "text-navy"}`}>{label}</p>
      {description && (
        <p className={`text-[11px] mt-0.5 leading-snug ${selected ? "text-blue-200" : "text-slate"}`}>{description}</p>
      )}
    </div>
    {selected && <span className="text-xs ml-auto flex-shrink-0 mt-0.5 opacity-70">✓</span>}
  </button>
);

export default function BriefPreferences() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const fromSubscribe = searchParams.get("from") === "subscribe";
  const [prefs, setPrefs] = useState({ industries: [] as string[], jurisdictions: [] as string[], topics: [] as string[], format: "full" });
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    // Fetch preferences
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
    // Fetch role from profile
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
    await Promise.all([
      (supabase as any)
        .from("user_brief_preferences")
        .upsert({ user_id: user.id, ...prefs, updated_at: new Date().toISOString() }, { onConflict: "user_id" }),
      // Save role to profile
      role ? supabase.from("profiles").update({ brief_role: role } as any).eq("id", user.id) : Promise.resolve(),
    ]);
    setSaving(false);
    setSaved(true);
    if (!isPremium) {
      toast("Preferences saved! They'll activate when you upgrade to Premium.");
    }
  };

  return (
    <>
      <Helmet><title>Configure Your Analyst | EndUserPrivacy Premium</title></Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <Topbar /><Navbar />
        <main className="flex-1 max-w-[860px] mx-auto px-4 md:px-8 py-10 w-full">
          {fromSubscribe && (
            <div className="mb-8 bg-gradient-to-r from-navy to-steel rounded-2xl p-5 text-white">
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400 mb-1">⭐ Welcome to Intelligence</p>
              <p className="font-display font-bold text-[18px] mb-1">Set your preferences to get your first personalized brief</p>
              <p className="text-blue-200 text-[13px]">Your brief is written specifically for your industry and jurisdictions. The form below takes 60 seconds — your first personalized brief arrives Monday.</p>
            </div>
          )}
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 text-blue text-xs font-bold uppercase tracking-widest mb-3">
              <span>⭐</span> Premium
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

          {/* Role */}
          <div className="mb-8">
            <h2 className="font-bold text-navy text-[15px] mb-1">Your role</h2>
            <p className="text-slate text-xs mb-4">Your brief is shaped by how you use regulatory intelligence.</p>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(r => (
                <button
                  key={r.id}
                  onClick={() => { setRole(r.id); setSaved(false); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                    role === r.id
                      ? "bg-navy text-white border-navy shadow-eup-sm"
                      : "bg-white text-slate border-fog hover:border-navy/30 hover:text-navy"
                  }`}
                >
                  <span>{r.icon}</span>
                  <span>{r.label}</span>
                  {role === r.id && <span className="text-xs ml-0.5 opacity-70">✓</span>}
                </button>
              ))}
            </div>
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
            <h2 className="font-bold text-navy text-[15px] mb-1">Your report tracks</h2>
            <p className="text-slate text-xs mb-4">Choose the topic tracks your analyst will cover every week. Select multiple for a combined brief.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

          {isPremium === false && (
            <div className="mt-6 mb-4 bg-fog rounded-2xl p-6 text-center">
              <p className="text-slate text-sm mb-3">
                Your analyst requires Premium ($20/month).
                Preferences are saved and will activate once you subscribe.
              </p>
              <Link
                to="/subscribe"
                className="inline-block bg-gradient-to-br from-navy to-blue text-white font-semibold text-sm px-6 py-2.5 rounded-xl no-underline hover:opacity-90 transition-all"
              >
                Upgrade to Premium →
              </Link>
            </div>
          )}

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
        </main>
        <Footer />
      </div>
    </>
  );
}
