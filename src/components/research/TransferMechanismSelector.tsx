import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

type FromKey = "eu" | "uk" | "other";
type ToKey = "us" | "adequate" | "non-adequate";

const FROM_OPTIONS: { value: FromKey; label: string }[] = [
  { value: "eu", label: "EU / EEA" },
  { value: "uk", label: "United Kingdom" },
  { value: "other", label: "Other origin" },
];

const TO_OPTIONS: { value: ToKey; label: string }[] = [
  { value: "us", label: "United States" },
  { value: "adequate", label: "Adequate country (e.g. Japan, Canada, Switzerland)" },
  { value: "non-adequate", label: "Non-adequate country (e.g. China, India)" },
];

type Mechanism = {
  name: string;
  why: string;
  href?: string;
  tool?: { label: string; href: string };
};

function mechanismsFor(from: FromKey, to: ToKey): Mechanism[] {
  if (from === "eu" || from === "uk") {
    if (to === "us") {
      return [
        {
          name: from === "eu" ? "EU–U.S. Data Privacy Framework (DPF)" : "UK–U.S. Data Bridge",
          why: "Cleanest path when the U.S. importer is DPF-certified. Verify active certification before each onboarding.",
          href: "#dpf",
        },
        {
          name: "2021 Standard Contractual Clauses + TIA",
          why: "Required fallback for non-DPF importers — and recommended belt-and-braces alongside DPF given Schrems III risk.",
          href: "#eu-mechanisms",
          tool: { label: "Generate SCCs / DPA", href: "/dpa-generator" },
        },
        {
          name: "Binding Corporate Rules (intra-group only)",
          why: "Multi-year DPA approval — only viable for established multinationals moving group data.",
          href: "#eu-mechanisms",
        },
      ];
    }
    if (to === "adequate") {
      return [
        {
          name: "Article 45 Adequacy Decision",
          why: "No additional mechanism required for in-scope data. Confirm the destination country and processing type are within the adequacy scope.",
          href: "#adequacy",
        },
        {
          name: "Contractual safeguards (best practice)",
          why: "Even where adequacy applies, a DPA documenting purpose, security and sub-processor terms is still required under Art. 28.",
          tool: { label: "Generate DPA", href: "/dpa-generator" },
        },
      ];
    }
    return [
      {
        name: "2021 Standard Contractual Clauses + TIA",
        why: "Default mechanism. The TIA must assess local surveillance law and document supplementary measures.",
        href: "#eu-mechanisms",
        tool: { label: "Generate SCCs / DPA", href: "/dpa-generator" },
      },
      {
        name: "Binding Corporate Rules",
        why: "For intra-group flows where the parent will commit to enforceable group-wide rules.",
        href: "#eu-mechanisms",
      },
      {
        name: "Article 49 derogations",
        why: "Narrow, non-systematic transfers only — explicit consent, contract necessity, or compelling legitimate interests.",
        tool: { label: "Run a Legitimate Interest Assessment", href: "/lia-tool" },
      },
    ];
  }
  // Other origin
  return [
    {
      name: "Local export rules of the origin country",
      why: "Start with the exporter's own framework (e.g. PIPL standard contracts, LGPD international transfer rules, PIPEDA accountability).",
      href: "#apac",
    },
    {
      name: "Contractual safeguards",
      why: "A DPA mirroring SCC obligations is widely accepted as a baseline even outside EU/UK jurisdiction.",
      tool: { label: "Generate DPA", href: "/dpa-generator" },
    },
  ];
}

export function TransferMechanismSelector() {
  const [from, setFrom] = useState<FromKey>("eu");
  const [to, setTo] = useState<ToKey>("us");
  const mechanisms = useMemo(() => mechanismsFor(from, to), [from, to]);

  return (
    <div className="rounded-2xl border border-fog bg-card shadow-eup-sm overflow-hidden">
      <div className="px-5 py-4 bg-navy text-white">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-sky">Quick answer</p>
        <h3 className="text-white text-lg mt-1">Which mechanism do I need?</h3>
      </div>
      <div className="p-5 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate">Transferring from</span>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value as FromKey)}
            className="mt-1.5 w-full py-2 px-3 text-sm border border-silver rounded-lg bg-paper text-navy outline-none focus:border-blue"
          >
            {FROM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <ArrowRight className="hidden md:block w-5 h-5 text-slate-light mb-3 mx-auto" />
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate">Transferring to</span>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value as ToKey)}
            className="mt-1.5 w-full py-2 px-3 text-sm border border-silver rounded-lg bg-paper text-navy outline-none focus:border-blue"
          >
            {TO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="px-5 pb-5 grid gap-3 md:grid-cols-3">
        {mechanisms.map((m) => (
          <div
            key={m.name}
            className="border-l-4 border-cobalt bg-paper rounded-lg p-4 flex flex-col gap-2"
          >
            <p className="text-sm font-semibold text-navy">{m.name}</p>
            <p className="text-xs text-slate leading-relaxed flex-1">{m.why}</p>
            <div className="flex flex-wrap gap-3 pt-1 text-xs">
              {m.href && (
                <a href={m.href} className="text-blue font-medium hover:underline no-underline">
                  Read in detail ↓
                </a>
              )}
              {m.tool && (
                <Link to={m.tool.href} className="text-accent font-semibold hover:underline no-underline">
                  {m.tool.label} →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="px-5 pb-4 text-[11px] text-slate-light">
        Guidance only — confirm jurisdiction-specific requirements with counsel before relying on a mechanism.
      </p>
    </div>
  );
}
