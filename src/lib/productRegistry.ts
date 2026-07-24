/**
 * ============================================================================
 *  PRODUCT REGISTRY — Single Source of Truth for product CTAs
 * ============================================================================
 *
 *  Every customer-facing tool surfaced as a CTA (Research guides, feed,
 *  weekly Intelligence Brief, etc.) should resolve its display name and
 *  destination route through this registry. Rename a product once here and
 *  every consumer updates.
 *
 *  Names are imported from src/config/pricing.ts where the product appears
 *  in the pricing registry (with Stripe-style suffixes like "(Standalone)"
 *  stripped). Tools that are not directly priced (free tools, landing
 *  pages, subscription-driven artifacts) carry hardcoded canonical names.
 *
 *  Routes MUST match the live paths registered in src/App.tsx.
 * ============================================================================
 */

import { getPrice, type PriceLookupKey } from "@/config/pricing";

export interface ProductEntry {
  /** Stable slug. snake-case-with-dashes; used by consumers to look up the entry. */
  slug: string;
  /** Canonical, user-facing product name. */
  name: string;
  /** Live route in App.tsx. */
  route: string;
  /** Short marketing pitch (one sentence, fits in a CTA card). */
  shortPitch: string;
  /** True when an active subscription grants free or included access. */
  tierIncluded: boolean;
  /** Revenue rank — lower number = higher priority. Used for sort order in matching. */
  priority: number;
  /** Lowercase phrases used by future content-matching to suggest this product. */
  triggers: string[];
}

/** Strip Stripe-style trailing parenthetical suffixes from a productName. */
const trimSuffix = (s: string): string => s.replace(/\s*\([^)]*\)\s*$/, "").trim();

/** Resolve the canonical product name from the pricing registry. */
const nameFrom = (key: PriceLookupKey): string => trimSuffix(getPrice(key).productName);

export const PRODUCT_REGISTRY: ProductEntry[] = [
  {
    slug: "cppa-risk-assessment",
    name: nameFrom("cppa_risk_standalone"),
    route: "/cppa-risk-assessment",
    shortPitch:
      "Module 1 of the CPPA audit suite — produce a defensible risk assessment aligned to California's automated decision-making rules.",
    tierIncluded: false,
    priority: 1,
    triggers: [
      "cppa risk assessment",
      "california risk assessment",
      "automated decisionmaking",
      "ccpa risk assessment",
      "cppa audit",
    ],
  },
  {
    slug: "cppa-cybersecurity",
    name: nameFrom("cppa_cyber_standalone"),
    route: "/cppa-cybersecurity",
    shortPitch:
      "Module 2 of the CPPA audit suite — readiness check against California's cybersecurity audit regulations.",
    tierIncluded: false,
    priority: 2,
    triggers: [
      "cppa cybersecurity",
      "california cybersecurity audit",
      "cppa audit",
      "cybersecurity readiness",
      "ccpa cybersecurity",
    ],
  },
  {
    slug: "cppa-admt-checker",
    name: nameFrom("cppa_admt_standalone"),
    route: "/cppa-admt-checker",
    shortPitch:
      "Module 3 of the CPPA audit suite — gap analysis for pre-use notices, opt-out obligations, and access rights under 11 CCR §§ 7200–7222 (January 1, 2027 deadline).",
    tierIncluded: false,
    priority: 3,
    triggers: [
      "admt",
      "automated decisionmaking technology",
      "pre-use notice",
      "cppa admt",
      "automated decision rights",
      "7220",
      "7221",
      "7222",
    ],
  },
  {
    slug: "cppa-scope-checker",
    name: "CPPA Scope Checker",
    route: "/cppa-scope-checker",
    shortPitch:
      "Five-minute scope check — confirm whether the CPPA's audit and risk-assessment thresholds apply to your business.",
    tierIncluded: true,
    priority: 4,
    triggers: [
      "cppa scope",
      "ccpa threshold",
      "california privacy threshold",
      "cppa applicability",
      "do i need a cppa audit",
    ],
  },
  {
    slug: "governance-assessment",
    name: nameFrom("hc_standalone_v2"),
    route: "/governance-assessment",
    shortPitch:
      "Assess your privacy program against active enforcement patterns from the EDPB, FTC, ICO and CPPA across ten governance domains.",
    tierIncluded: false,
    priority: 5,
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
    name: nameFrom("dpia_standalone_v2"),
    route: "/dpia-framework",
    shortPitch:
      "Generate a structured Data Protection Impact Assessment aligned to GDPR Article 35 and EDPB WP 248.",
    tierIncluded: false,
    priority: 6,
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
    name: nameFrom("li_standalone_v2"),
    route: "/li-assessment",
    shortPitch:
      "Documented three-part balancing test for processing relying on legitimate interests under GDPR Article 6(1)(f).",
    tierIncluded: false,
    priority: 7,
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
    name: nameFrom("ir_standalone_v2"),
    route: "/ir-playbook",
    shortPitch:
      "Jurisdiction-specific incident response playbook covering notification deadlines, regulator contacts and required content.",
    tierIncluded: true,
    priority: 8,
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
    name: nameFrom("biometric_standalone_v2"),
    route: "/biometric-checker",
    shortPitch:
      "Covers BIPA, Texas CUBI, Washington and GDPR biometric requirements in a single structured assessment.",
    tierIncluded: true,
    priority: 9,
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
    name: nameFrom("dpa_standalone_v2"),
    route: "/dpa-generator",
    shortPitch:
      "Generate a custom Data Processing Agreement or Standard Contractual Clauses module for any controller-processor arrangement.",
    tierIncluded: true,
    priority: 10,
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
    name: "RoPA Builder",
    route: "/ropa-builder",
    shortPitch:
      "Build and maintain your GDPR Article 30 Record of Processing Activities — included free with any active subscription.",
    tierIncluded: true,
    priority: 11,
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
    name: "US Privacy Notice Builder",
    route: "/us-notice-builder",
    shortPitch:
      "Generate a CCPA/CPRA-compliant US privacy notice tailored to each state where you do business.",
    tierIncluded: true,
    priority: 12,
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
    name: "EU & Global Privacy Notice Builder",
    route: "/eu-global-notice-builder",
    shortPitch:
      "GDPR- and global-aligned privacy notice with cookie disclosures, legal basis tables and data-subject rights wording.",
    tierIncluded: true,
    priority: 13,
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
    name: "Registration Manager",
    route: "/registration-manager",
    shortPitch:
      "DPO, DPA and AI Act registration filings with attorney-review-ready document packs and renewal monitoring.",
    tierIncluded: false,
    priority: 14,
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
    name: "Privacy Intelligence Report",
    route: "/get-intelligence",
    shortPitch:
      "Weekly Intelligence Brief — what changed in privacy regulation, personalized to your jurisdictions and topics. Arrives every Monday.",
    tierIncluded: true,
    priority: 15,
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
    name: "Privacy Intelligence Feed",
    route: "/updates",
    shortPitch:
      "Daily privacy intelligence feed covering enforcement, legislation, guidance and regulator actions worldwide.",
    tierIncluded: true,
    priority: 16,
    triggers: [
      "privacy news",
      "enforcement feed",
      "daily updates",
      "regulator actions",
      "privacy intelligence",
    ],
  },
];

const BY_SLUG: Record<string, ProductEntry> = Object.fromEntries(
  PRODUCT_REGISTRY.map((p) => [p.slug, p]),
);

/** Look up a product entry by slug. Throws if missing — fail loud at call sites. */
export function getProduct(slug: string): ProductEntry {
  const entry = BY_SLUG[slug];
  if (!entry) throw new Error(`Unknown product slug: ${slug}`);
  return entry;
}

/**
 * Find products whose triggers appear (case-insensitive substring) in the
 * provided text. Returned highest-priority-first. Reserved for future feed
 * and weekly-report content matching; no consumers wired up yet.
 */
export function findProductsByText(text: string): ProductEntry[] {
  if (!text) return [];
  const haystack = text.toLowerCase();
  const matches = PRODUCT_REGISTRY.filter((p) =>
    p.triggers.some((t) => haystack.includes(t)),
  );
  return matches.sort((a, b) => a.priority - b.priority);
}
