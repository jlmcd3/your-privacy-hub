// Cross-link footer for CPPA tool intake pages. Surfaces the other tools
// in the suite so users (and search engines) can traverse the CPPA cluster
// from any node.

import { Link } from "react-router-dom";

type ToolKey = "scope" | "risk" | "cyber" | "admt";

const LINKS: Record<ToolKey, { to: string; title: string; blurb: string }> = {
  scope: {
    to: "/cppa-scope-checker",
    title: "CPPA Scope Checker",
    blurb: "Free 2-minute check — does CCPA/CPRA + CPPA enforcement apply to you?",
  },
  risk: {
    to: "/cppa-risk-assessment",
    title: "CPPA Risk Assessment",
    blurb: "Module 1 — domain findings cited to statute, regulation, and FSOR reasoning.",
  },
  cyber: {
    to: "/cppa-cybersecurity",
    title: "CPPA Cybersecurity Audit Readiness",
    blurb: "Module 2 — 18-control gap report with Breach Precedent Map and Auditor Handoff.",
  },
  admt: {
    to: "/cppa-admt-checker",
    title: "ADMT Compliance Checker",
    blurb: "Module 3 — pre-use notice, opt-out, and access right gap analysis for automated decisionmaking systems. January 1, 2027 deadline.",
  },
};

export default function CPPAToolsCrossLinks({ current }: { current: ToolKey }) {
  const others = (Object.keys(LINKS) as ToolKey[]).filter((k) => k !== current);
  return (
    <section
      aria-labelledby="cppa-related-tools"
      className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-12"
    >
      <h2 id="cppa-related-tools" className="text-base font-serif mb-3">
        Related CPPA tools
      </h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {others.map((k) => {
          const item = LINKS[k];
          return (
            <Link
              key={k}
              to={item.to}
              className="block rounded-lg border bg-card p-4 hover:border-accent transition-colors no-underline"
            >
              <div className="font-medium text-foreground">{item.title}</div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.blurb}</p>
            </Link>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Every CPPA finding cites the California statute, the CPPA's implementing regulations,
        the agency's reasoning in the{" "}
        <span className="font-medium">Final Statement of Reasons (FSOR)</span>, and on-point AG
        or CPPA enforcement actions.
      </p>
    </section>
  );
}
