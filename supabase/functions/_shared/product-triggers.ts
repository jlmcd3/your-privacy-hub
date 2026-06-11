// TRIGGER MIRROR — slugs, triggers, and priority MUST mirror
// src/lib/productRegistry.ts PRODUCT_REGISTRY exactly. Display fields
// (name/route/pitch) are intentionally NOT mirrored for the matcher, but
// PRODUCT_DISPLAY below DOES mirror name+route for email rendering (no
// frontend imports allowed in edge functions). Update both files in the
// same commit.

export interface ProductTrigger {
  slug: string;
  priority: number;
  triggers: string[];
}

export const PRODUCT_TRIGGERS: ProductTrigger[] = [
  {
    slug: "cppa-risk-assessment",
    priority: 1,
    triggers: [
      "cppa risk assessment",
      "california risk assessment",
      "risk assessment regulations",
      "automated decisionmaking",
      "automated decision-making",
      "admt",
      "ccpa risk assessment",
      "cppa audit",
    ],
  },
  {
    slug: "cppa-cybersecurity",
    priority: 2,
    triggers: [
      "cppa cybersecurity",
      "california cybersecurity audit",
      "cybersecurity audit regulations",
      "cppa audit",
      "cybersecurity readiness",
      "ccpa cybersecurity",
    ],
  },
  {
    slug: "cppa-scope-checker",
    priority: 3,
    triggers: [
      "cppa scope",
      "ccpa threshold",
      "california privacy threshold",
      "cppa applicability",
      "cppa",
      "california privacy protection agency",
      "do i need a cppa audit",
    ],
  },
  {
    slug: "governance-assessment",
    priority: 4,
    triggers: [
      "privacy program assessment",
      "governance assessment",
      "privacy maturity",
      "privacy program review",
      "accountability",
      "compliance gap analysis",
    ],
  },
  {
    slug: "dpia",
    priority: 5,
    triggers: [
      "dpia",
      "data protection impact assessment",
      "article 35",
      "impact assessment",
      "high-risk processing",
      "edpb wp 248",
    ],
  },
  {
    slug: "lia",
    priority: 6,
    triggers: [
      "legitimate interest",
      "lia",
      "balancing test",
      "article 6 1 f",
      "edpb opinion 28",
      "lawful basis",
    ],
  },
  {
    slug: "ir-playbook",
    priority: 7,
    triggers: [
      "incident response",
      "breach response plan",
      "breach notification procedure",
      "article 33",
      "article 34",
      "data breach playbook",
    ],
  },
  {
    slug: "biometric-checker",
    priority: 8,
    triggers: [
      "biometric",
      "bipa",
      "facial recognition",
      "fingerprint",
      "voiceprint",
      "biometric identifier",
    ],
  },
  {
    slug: "dpa-generator",
    priority: 9,
    triggers: [
      "data processing agreement",
      "dpa",
      "standard contractual clauses",
      "scc",
      "article 28",
      "processor agreement",
    ],
  },
  {
    slug: "ropa",
    priority: 10,
    triggers: [
      "ropa",
      "record of processing",
      "article 30",
      "processing inventory",
      "data mapping",
    ],
  },
  {
    slug: "us-notice",
    priority: 11,
    triggers: [
      "us privacy notice",
      "ccpa notice",
      "cpra notice",
      "privacy policy us",
      "state privacy notice",
    ],
  },
  {
    slug: "eu-global-notice",
    priority: 12,
    triggers: [
      "gdpr privacy notice",
      "eu privacy notice",
      "global privacy notice",
      "cookie notice",
      "article 13",
      "article 14",
    ],
  },
  {
    slug: "registration-manager",
    priority: 13,
    triggers: [
      "dpo registration",
      "dpa filing",
      "ai act registration",
      "regulator notification",
      "appointment filing",
    ],
  },
  {
    slug: "intelligence-report",
    priority: 14,
    triggers: [
      "weekly report",
      "intelligence brief",
      "weekly privacy update",
      "privacy newsletter",
      "weekly summary",
    ],
  },
  {
    slug: "intelligence-feed",
    priority: 15,
    triggers: [
      "privacy news",
      "enforcement feed",
      "daily updates",
      "regulator actions",
      "privacy intelligence",
    ],
  },
];

export function matchProductCtas(
  text: string,
  maxResults = 3,
): { slug: string; trigger: string }[] {
  if (!text) return [];
  const haystack = text.toLowerCase();
  const hits: { slug: string; trigger: string; priority: number }[] = [];
  for (const p of PRODUCT_TRIGGERS) {
    const t = p.triggers.find((t) => haystack.includes(t));
    if (t) hits.push({ slug: p.slug, trigger: t, priority: p.priority });
  }
  return hits
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxResults)
    .map(({ slug, trigger }) => ({ slug, trigger }));
}

// Display mirror — names/routes copied verbatim from src/lib/productRegistry.ts.
// Used by edge functions (e.g. email rendering) that cannot import frontend code.
export const PRODUCT_DISPLAY: Record<string, { name: string; route: string }> = {
  "cppa-risk-assessment": { name: "CPPA Risk Assessment — Module 1", route: "/cppa-risk-assessment" },
  "cppa-cybersecurity": { name: "CPPA Cybersecurity Readiness — Module 2", route: "/cppa-cybersecurity" },
  "cppa-scope-checker": { name: "CPPA Scope Checker", route: "/cppa-scope-checker" },
  "governance-assessment": { name: "Privacy Program Assessment", route: "/governance-assessment" },
  "dpia": { name: "Impact Assessment Builder", route: "/dpia-framework" },
  "lia": { name: "Legitimate Interest Assessment", route: "/li-assessment" },
  "ir-playbook": { name: "Incident Response Playbook", route: "/ir-playbook" },
  "biometric-checker": { name: "Biometric Compliance Check", route: "/biometric-checker" },
  "dpa-generator": { name: "Custom DPA Generator", route: "/dpa-generator" },
  "ropa": { name: "RoPA Builder", route: "/ropa-builder" },
  "us-notice": { name: "US Privacy Notice Builder", route: "/us-notice-builder" },
  "eu-global-notice": { name: "EU & Global Privacy Notice Builder", route: "/eu-global-notice-builder" },
  "registration-manager": { name: "Registration Manager", route: "/registration-manager" },
  "intelligence-report": { name: "Privacy Intelligence Report", route: "/pricing" },
  "intelligence-feed": { name: "Privacy Intelligence Feed", route: "/updates" },
};
