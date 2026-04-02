import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

const FEATURES = [
  { icon: "📋", label: "Weekly Intelligence Brief", desc: "Every Monday, synthesized from 67+ regulatory sources" },
  { icon: "📊", label: "Comparison Tools", desc: "20 US states and 10 global jurisdictions, side by side" },
  { icon: "🌍", label: "Jurisdiction Explorer", desc: "150+ country profiles with regulator contacts" },
];

export default function OnboardingModal({ userId, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleJurisdiction = (j: string) => {
    setJurisdictions(prev => prev.includes(j) ? prev.filter(x => x !== j) : [...prev, j]);
  };

  const finish = async () => {
    setSaving(true);
    await (supabase as any)
      .from("profiles")
      .update({
        onboarding_complete: true,
        industry: role,
        jurisdictions,
      })
      .eq("id", userId);
    setSaving(false);
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
            <h2 className="font-display font-bold text-foreground text-[20px] text-center mb-2">
              What best describes your role?
            </h2>
            <p className="text-muted-foreground text-[13px] text-center mb-6">
              Your Intelligence Brief is shaped by how you use regulatory information.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-all cursor-pointer ${
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
            <h2 className="font-display font-bold text-foreground text-[20px] text-center mb-2">
              Which regions matter most to you?
            </h2>
            <p className="text-muted-foreground text-[13px] text-center mb-6">
              Select all that apply — your brief will prioritize these.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {JURISDICTIONS.map(j => (
                <button
                  key={j}
                  type="button"
                  onClick={() => toggleJurisdiction(j)}
                  className={`px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-all cursor-pointer ${
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
            <h2 className="font-display font-bold text-foreground text-[20px] text-center mb-6">
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
            <button
              onClick={finish}
              disabled={saving}
              className="w-full py-3 rounded-xl text-[14px] font-bold transition-all cursor-pointer border-none bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 mb-3"
            >
              {saving ? "Saving…" : "Go to my dashboard →"}
            </button>
            <div className="text-center">
              <a href="/sample-brief" className="text-[13px] text-muted-foreground hover:text-foreground no-underline transition-colors">
                See a sample brief →
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
