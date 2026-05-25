import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";

type Answer = "yes" | "no" | null;

const QUESTIONS: { id: string; label: string; help?: string }[] = [
  {
    id: "biometric",
    label: "Are you collecting biometric identifiers (fingerprints, face geometry, voiceprints, iris/retina scans) or biometric information derived from them?",
  },
  {
    id: "us-nexus",
    label: "Do you have employees, customers, or operations located in Illinois, Texas, Washington, or another U.S. state with comprehensive privacy law (California, Colorado, Virginia, Connecticut, Oregon, Montana, etc.)?",
  },
  {
    id: "workplace",
    label: "Is the data being collected from employees or in a workplace context (timekeeping, access control, monitoring)?",
  },
  {
    id: "identification",
    label: "Is the data used to uniquely identify a specific individual (rather than only count or detect presence)?",
  },
];

export function BiometricDecisionChecklist() {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const allAnswered = QUESTIONS.every((q) => answers[q.id] !== null && answers[q.id] !== undefined);

  const result = useMemo(() => {
    if (!allAnswered) return null;
    const a = answers;
    if (a.biometric === "no") {
      return {
        tone: "muted" as const,
        title: "Biometric statutes likely do not apply",
        body: "Without biometric identifiers in scope, BIPA, CUBI and Washington biometric law are not triggered. General comprehensive privacy laws (CCPA/CPRA, etc.) may still apply to other categories of personal data.",
        statutes: [] as string[],
      };
    }
    const statutes: string[] = [];
    if (a["us-nexus"] === "yes") {
      statutes.push("Illinois BIPA (if any IL residents)", "Texas CUBI", "Washington RCW 19.375", "Comprehensive state privacy laws (CCPA/CPRA, CPA, VCDPA, CTDPA, OCPA, MTCDPA — biometric data treated as sensitive)");
    }
    if (a.workplace === "yes") {
      statutes.push("BIPA workplace exposure (largest litigation vector — fingerprint clocks, facial access)", "EEOC algorithmic-fairness guidance", "Potential NLRA mandatory-bargaining obligation");
    }
    if (a.identification === "yes") {
      statutes.push("GDPR Article 9 (special category — explicit consent required for identification)", "EU AI Act restrictions on biometric identification in public spaces");
    }
    const highest = a["us-nexus"] === "yes" && a.identification === "yes";
    return {
      tone: highest ? "high" as const : "moderate" as const,
      title: highest
        ? "High-stakes biometric programme — BIPA-style exposure applies"
        : "Biometric obligations apply — moderate exposure",
      body: highest
        ? "You're operating in the most heavily litigated combination: U.S. nexus + biometric identifiers used for identification. BIPA's $1,000–$5,000 per-scan damages and private right of action are the dominant risk."
        : "Biometric statutes are in scope. Confirm consent, retention policy, and security controls against the statutes below.",
      statutes,
    };
  }, [answers, allAnswered]);

  const setAnswer = (id: string, value: Answer) => setAnswers((s) => ({ ...s, [id]: value }));

  return (
    <div className="rounded-2xl border border-brand-cloud bg-card shadow-eup-sm overflow-hidden">
      <div className="px-5 py-4 bg-brand-navy text-white">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-brand-mist">Compliance triage</p>
        <h3 className="text-white text-lg mt-1">Does biometric law apply to you?</h3>
        <p className="text-xs text-brand-mist mt-1">Answer four questions to surface the in-scope statutes.</p>
      </div>
      <ol className="divide-y divide-brand-cloud">
        {QUESTIONS.map((q, idx) => (
          <li key={q.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex-1">
              <p className="text-sm text-brand-navy">
                <span className="font-semibold text-slate mr-1">{idx + 1}.</span>
                {q.label}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {(["yes", "no"] as const).map((opt) => {
                const active = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setAnswer(q.id, opt)}
                    className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${
                      active
                        ? opt === "yes"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-600 text-white border-slate-600"
                        : "bg-brand-cloud text-slate border-silver hover:border-brand-navy/40"
                    }`}
                  >
                    {opt === "yes" ? <Check className="inline w-3 h-3 mr-1" /> : <X className="inline w-3 h-3 mr-1" />}
                    {opt}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      {result && (
        <div
          className={`px-5 py-5 border-t-4 ${
            result.tone === "high"
              ? "border-rose-500 bg-rose-50"
              : result.tone === "moderate"
              ? "border-amber-500 bg-amber-50"
              : "border-slate-300 bg-brand-cloud"
          }`}
        >
          <p className="text-sm font-semibold text-brand-navy">{result.title}</p>
          <p className="text-xs text-slate mt-1 leading-relaxed">{result.body}</p>
          {result.statutes.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-brand-navy list-disc list-inside">
              {result.statutes.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/biometric-checker"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 no-underline"
            >
              Run the Biometric Compliance Check →
            </Link>
            <button
              onClick={() => setAnswers({})}
              className="text-xs text-slate hover:text-brand-navy underline-offset-2 hover:underline bg-transparent border-none cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
