import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";
import usStateComparison from "@/data/us_state_comparison.json";
import { BarChart3, ClipboardList, Globe } from 'lucide-react';

interface OnboardingModalProps {
  userId: string;
  onComplete: () => void;
}

const ROLES = [
  "Data Protection Officer",
  "General Counsel",
  "Compliance Manager",
  "Privacy Consultant",
  "Legal Researcher",
  "Other",
];

const JURISDICTIONS = [
  "EU & UK",
  "United States (Federal)",
  "US States",
  "APAC",
  "Latin America",
  "Canada",
  "Middle East & Africa",
  "Global",
];

export default function OnboardingModal({ userId, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Derive the "US states covered" count from the canonical dataset so onboarding
  // copy stays truthful when we add or drop states.
  const usStatesCount = useMemo(() => {
    const rows = (usStateComparison as { states?: unknown[] }).states;
    return Array.isArray(rows) ? rows.length : 0;
  }, []);

  const FEATURES = useMemo(
    () => [
      { icon: <ClipboardList aria-hidden="true" strokeWidth={1.75} className="w-6 h-6 text-brand-teal" />, label: "Monday Privacy Intelligence Report", desc: "Free weekly headline digest, filtered to your regions and topics. Sent Monday." },
      {
        icon: <BarChart3 aria-hidden="true" strokeWidth={1.75} className="w-6 h-6 text-brand-teal" />,
        label: "Comparison Tools",
        desc: usStatesCount > 0
          ? `${usStatesCount} US states and global jurisdictions, side by side`
          : "US states and global jurisdictions, side by side",
      },
      { icon: <Globe aria-hidden="true" strokeWidth={1.75} className="w-6 h-6 text-brand-teal" />, label: "Jurisdiction Explorer", desc: "Country profiles with regulator contacts worldwide" },
    ],
    [usStatesCount],
  );

  const toggleJurisdiction = (j: string) => {
    setJurisdictions(prev => prev.includes(j) ? prev.filter(x => x !== j) : [...prev, j]);
  };

  const finish = async () => {
    setSaving(true);
    setSaveError(null);
    // Save role via the security-definer routine (ITEM 360: `user_role` is a
    // service-role-only column). Do NOT overwrite `industry`.
    // Set `onboarding_complete` only when the write succeeds.
    const { error: roleErr } = await (supabase as any).rpc("set_self_declared_role", {
      _role: role || null,
      _primary_jurisdiction: null,
      _sector: null,
    });
    const { error } = roleErr
      ? { error: roleErr }
      : await (supabase as any)
          .from("profiles")
          .update({
            onboarding_complete: true,
            jurisdictions,
          })
          .eq("id", userId);

    setSaving(false);
    if (error) {
      // Keep the modal open, preserve selections, announce via role="alert".
      setSaveError(error.message || "We couldn't save your preferences. Please try again.");
      return;
    }
    void trackEvent("onboarding_completed", { role, jurisdictions_count: jurisdictions.length });
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                s === step ? "bg-primary" : s < step ? "bg-primary/40" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Role */}
        {step === 1 && (
          <>
            <h2 className="font-display text-foreground text-center mb-2">
              What best describes your role?
            </h2>
            <p className="text-muted-foreground text-sm text-center mb-6">
              Your Privacy Intelligence Report is shaped by how you use regulatory information.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                    role === r
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/40"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!role}
              className="w-full py-3 rounded-xl text-[14px] font-bold transition-all cursor-pointer border-none bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              Next →
            </button>
          </>
        )}

        {/* Step 2: Jurisdictions */}
        {step === 2 && (
          <>
            <h2 className="font-display text-foreground text-center mb-2">
              Which regions matter most to you?
            </h2>
            <p className="text-muted-foreground text-sm text-center mb-6">
              Select all that apply — your brief will prioritize these.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {JURISDICTIONS.map(j => (
                <button
                  key={j}
                  type="button"
                  onClick={() => toggleJurisdiction(j)}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                    jurisdictions.includes(j)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/40"
                  }`}
                >
                  {j}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl text-[14px] font-medium transition-all cursor-pointer border border-border bg-background text-foreground hover:bg-muted"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl text-[14px] font-bold transition-all cursor-pointer border-none bg-primary text-primary-foreground hover:opacity-90"
              >
                Next →
              </button>
            </div>
          </>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <>
            <h2 className="font-display text-foreground text-center mb-6">
              You're all set.
            </h2>
            <div className="space-y-4 mb-8">
              {FEATURES.map(f => (
                <div key={f.label} className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{f.icon}</span>
                  <div>
                    <p className="text-[14px] font-bold text-foreground">{f.label}</p>
                    <p className="text-[12px] text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            {saveError && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
              >
                {saveError}
              </div>
            )}
            <button
              onClick={finish}
              disabled={saving}
              className="w-full py-3 rounded-xl text-[14px] font-bold transition-all cursor-pointer border-none bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 mb-3"
            >
              {saving ? "Saving…" : saveError ? "Retry" : "Go to my dashboard →"}
            </button>
            <div className="text-center">
              <a href="/#brief" className="text-sm text-muted-foreground hover:text-foreground no-underline transition-colors">
                See a sample brief →
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
