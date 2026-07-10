/**
 * Courier C — shared under-hero strip for the five GDPR intake pages
 * (Governance, DPIA, DPA, LIA, IR). Presents the "Outputs support your
 * legal review — they do not replace legal judgment." disclaimer and an
 * "Also available" cross-link row so any of the five is reachable from
 * any other.
 *
 * Additive-only: sits between the page <header> and <main>. Does not
 * change intake flow, pricing, or analytics.
 */
import { Link } from "react-router-dom";

type ToolId = "governance" | "dpia" | "dpa" | "lia" | "ir_playbook";

const ALL: Array<{ id: ToolId; label: string; href: string }> = [
  { id: "governance", label: "GDPR Governance Assessment", href: "/governance-assessment" },
  { id: "dpia",       label: "Impact Assessment (DPIA)",   href: "/dpia-framework" },
  { id: "dpa",        label: "Custom DPA Generator",       href: "/dpa-generator" },
  { id: "lia",        label: "Legitimate Interest Assessment", href: "/li-assessment" },
  { id: "ir_playbook",label: "Incident Response Playbook", href: "/ir-playbook" },
];

export default function ToolAlsoAvailableRow({ currentTool }: { currentTool: ToolId }) {
  const others = ALL.filter((t) => t.id !== currentTool);
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="bg-card border border-brand-cloud rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
        <p className="text-meta text-brand-navy italic md:flex-1">
          Outputs support your legal review — they do not replace legal judgment.
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-eyebrow text-brand-mist">Also available:</span>
          {others.map((t, i) => (
            <span key={t.id} className="text-sm">
              <Link to={t.href} className="text-brand-teal-text hover:underline no-underline">
                {t.label}
              </Link>
              {i < others.length - 1 && <span className="text-brand-mist ml-3">·</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
