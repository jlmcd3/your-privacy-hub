import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

// Deterministic static selector wired VERBATIM from
// EUP_DocU_Tools_Selector_Label_Set_SIGNOFF (U-S). No fetch, no LLM.
// Result card reuses each tool's EXISTING name/tagline/route from
// the TOOLS config passed in as `tools`, plus its sample slug from
// SAMPLE_SLUG_MAP. No new descriptive copy beyond the labels below.

type ToolRef = { slug: string; name: string; tagline: string; href: string };

type Props = {
  tools: ToolRef[];
  sampleSlugMap: Record<string, string>;
};

type Branch = "A" | "B" | "C";

const Q1_LABEL = "What are you trying to produce?";
const Q1_OPTIONS: { label: string; branch: Branch }[] = [
  { label: "An assessment or evaluation of a specific risk or activity", branch: "A" },
  { label: "A document you can file, send, or hand to counsel", branch: "B" },
  { label: "Something specific to CPPA (California) obligations", branch: "C" },
];

const Q2A_LABEL = "What does it need to cover?";
const Q2A_OPTIONS: { label: string; slug: string }[] = [
  { label: "General GDPR governance / accountability posture", slug: "healthcheck" },
  { label: "Whether a specific processing activity is justified under legitimate interest", slug: "li-assessment" },
  { label: "Data protection impact of a new or changed activity (DPIA)", slug: "dpia" },
  { label: "Biometric data collection or use", slug: "biometric-checker" },
];

const Q2B_LABEL = "What kind of document?";
const Q2B_OPTIONS: { label: string; slug: string }[] = [
  { label: "A data processing agreement with a vendor", slug: "dpa-generator" },
  { label: "A breach or incident response plan", slug: "ir-playbook" },
  { label: "A record of processing activities (Article 30)", slug: "ropa-builder" },
  { label: "A U.S.-facing privacy notice", slug: "us-notices" },
  { label: "An EU/UK-facing privacy notice", slug: "eu-notices" },
  { label: "A regulator or DPO registration filing", slug: "registration-manager" },
];

const Q2C_LABEL = "Where are you starting?";
const Q2C_OPTIONS: { label: string; slug: string }[] = [
  { label: "Not sure if CPPA rules apply to us yet", slug: "cppa-scope-checker" },
  { label: "We know CPPA applies — need the risk assessment", slug: "cppa-risk-assessment" },
  { label: "Need a cybersecurity audit under CPPA rules", slug: "cppa-cybersecurity" },
  { label: "Using automated decision-making technology (ADMT)", slug: "cppa-admt-checker" },
];

const STORAGE_KEY = "eup_tools_selector_used_v1";

export default function ToolsSelector({ tools, sampleSlugMap }: Props) {
  const [branch, setBranch] = useState<Branch | null>(null);
  const [resultSlug, setResultSlug] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<boolean>(true);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY)) {
        setExpanded(false);
      }
    } catch {
      // ignore
    }
  }, []);

  const markUsed = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  const reset = () => {
    setBranch(null);
    setResultSlug(null);
  };

  const resolved = resultSlug ? tools.find((t) => t.slug === resultSlug) : null;
  const sampleSlug = resolved ? sampleSlugMap[resolved.slug] : undefined;

  const chip = "text-left w-full border border-brand-cloud rounded-lg px-4 py-3 text-sm bg-card hover:border-brand-teal hover:bg-brand-teal/5 transition";

  return (
    <section aria-label="Which tool do I need?" className="bg-background border-t border-brand-cloud">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-eyebrow text-slate-600 mb-0.5">Selector</p>
            <h2 className="text-[18px] font-semibold text-brand-navy">Which tool do I need?</h2>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-sm text-brand-navy underline underline-offset-2"
            aria-expanded={expanded}
          >
            {expanded ? "Hide" : "Show"}
          </button>
        </div>

        {expanded && (
          <div className="mt-4">
            {!branch && !resolved && (
              <div>
                <p className="text-sm font-medium text-slate-800 mb-3">{Q1_LABEL}</p>
                <div className="grid sm:grid-cols-3 gap-2">
                  {Q1_OPTIONS.map((o) => (
                    <button key={o.branch} type="button" className={chip} onClick={() => setBranch(o.branch)}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {branch && !resolved && (
              <div>
                <p className="text-sm font-medium text-slate-800 mb-3">
                  {branch === "A" ? Q2A_LABEL : branch === "B" ? Q2B_LABEL : Q2C_LABEL}
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {(branch === "A" ? Q2A_OPTIONS : branch === "B" ? Q2B_OPTIONS : Q2C_OPTIONS).map((o) => (
                    <button
                      key={o.slug}
                      type="button"
                      className={chip}
                      onClick={() => {
                        setResultSlug(o.slug);
                        markUsed();
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={reset} className="mt-3 text-xs text-slate-600 underline">
                  ← Back
                </button>
              </div>
            )}

            {resolved && (
              <div className="border border-brand-cloud rounded-xl bg-card p-5">
                <p className="text-eyebrow text-brand-teal-text mb-1">Recommended tool</p>
                <h3 className="text-[18px] font-semibold text-brand-navy mb-1">{resolved.name}</h3>
                <p className="text-sm text-slate-700 mb-4">{resolved.tagline}</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <Link
                    to={resolved.href}
                    className="text-sm font-semibold bg-brand-teal-deep text-white px-4 py-2 rounded-lg no-underline hover:opacity-90"
                  >
                    Open {resolved.name} →
                  </Link>
                  {sampleSlug && (
                    <Link
                      to={`/samples/${sampleSlug}`}
                      className="text-sm font-medium text-brand-navy underline underline-offset-2"
                    >
                      See a sample report
                    </Link>
                  )}
                  <button type="button" onClick={reset} className="text-sm text-slate-600 underline ml-auto">
                    See all tools
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
