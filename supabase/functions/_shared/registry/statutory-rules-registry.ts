// FORK-R1 — Shared registry of statutory rules previously hardcoded in generator prompts.
//
// Discipline (mirrors enforcement-figures-registry):
//   every entry carries `id`, `citation`, `verifyAgainst` URL, and `lastVerified`
//   (YYYY-MM-DD) so R5 (verify-registry) can audit it.
//
// PRINCIPLE: facts live ONCE. Generators inject these blocks via
// renderRegistryFor(tool) from product-manifest.ts. A one-line edit here
// changes every product on the next run.
//
// Seeded from facts inline in BIOMETRIC_RULEBOOK as of 2026-06-28:
//   - Private right of action by statute (PRA_BY_STATUTE)
//   - Texas CUBI subsection map (CUBI_SUBSECTIONS)
//   - Florida FDBR applicability (FDBR_THRESHOLD)
//   - BIPA core citations + Clay v. Union Pacific (BIPA_CITATIONS)

export type RegistryEntry = {
  id: string;
  citation: string;       // canonical citation text
  verifyAgainst: string;  // primary source URL
  lastVerified: string;   // YYYY-MM-DD
  note?: string;
};

// ─────────────────────────────────────────────────────────────
// Private right of action, by statute
// ─────────────────────────────────────────────────────────────

export type PraEntry = RegistryEntry & {
  statute: "BIPA" | "CUBI" | "VCDPA" | "CPRA" | string;
  scope: "broad_pra" | "ag_only" | "breach_only" | "supervisory_authority";
  description: string;
};

export const PRA_BY_STATUTE: PraEntry[] = [
  {
    id: "pra-bipa",
    statute: "BIPA",
    scope: "broad_pra",
    citation: "740 ILCS 14/20",
    description:
      "Illinois BIPA grants a broad private right of action per person per violation, with liquidated damages of $1,000 (negligent) or $5,000 (intentional/reckless).",
    verifyAgainst: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
    lastVerified: "2026-06-28",
  },
  {
    id: "pra-cubi",
    statute: "CUBI",
    scope: "ag_only",
    citation: "Tex. Bus. & Com. Code § 503.001(d)",
    description:
      "Texas CUBI has NO private right of action. Enforcement is by the Texas Attorney General only; civil penalty up to $25,000 per violation.",
    verifyAgainst:
      "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
    lastVerified: "2026-06-28",
  },
  {
    id: "pra-vcdpa",
    statute: "VCDPA",
    scope: "ag_only",
    citation: "Va. Code § 59.1-584",
    description:
      "Virginia VCDPA has NO private right of action. Exclusive enforcement is by the Virginia Attorney General.",
    verifyAgainst:
      "https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/",
    lastVerified: "2026-06-28",
  },
  {
    id: "pra-cpra",
    statute: "CPRA",
    scope: "breach_only",
    citation: "Cal. Civ. Code § 1798.150",
    description:
      "California CPRA provides a LIMITED private right of action ONLY for data breaches involving unauthorized access/exfiltration of specified personal information due to failure to maintain reasonable security — NOT for general biometric or privacy violations.",
    verifyAgainst:
      "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.150",
    lastVerified: "2026-06-28",
  },
];

export function renderPraByStatute(statutes: string[]): string {
  const wanted = new Set(statutes.map((s) => s.toUpperCase()));
  const rows = PRA_BY_STATUTE.filter((p) => wanted.has(p.statute.toUpperCase()));
  if (rows.length === 0) return "";
  const lines: string[] = [
    "PRIVATE RIGHT OF ACTION — BY STATUTE (authoritative; use these scopes, do NOT generalize \"regulators and private claimants\"):",
  ];
  for (const r of rows) {
    lines.push(`- ${r.statute} (${r.citation}): ${r.description}`);
  }
  lines.push(
    "Always use jurisdiction-specific enforcement language. Never imply private litigation exposure where a statute is AG-enforced only.",
  );
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────
// Texas CUBI subsection map
// ─────────────────────────────────────────────────────────────

export type CubiSubsection = RegistryEntry & {
  subsection: string;       // e.g. "(b)", "(c)(1)", "(d)", "(e)"
  topic: string;
  effectiveFrom?: string;   // YYYY-MM-DD, when applicable
};

export const CUBI_SUBSECTIONS: CubiSubsection[] = [
  {
    id: "cubi-b",
    subsection: "(b)",
    topic: "Consent and notice before or at the time of capture.",
    citation: "Tex. Bus. & Com. Code § 503.001(b)",
    verifyAgainst:
      "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
    lastVerified: "2026-06-28",
  },
  {
    id: "cubi-c1",
    subsection: "(c)(1)",
    topic: "Prohibition on sale, lease, or other disclosure of biometric identifiers.",
    citation: "Tex. Bus. & Com. Code § 503.001(c)(1)",
    verifyAgainst:
      "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
    lastVerified: "2026-06-28",
  },
  {
    id: "cubi-c2",
    subsection: "(c)(2)",
    topic: "Reasonable security for storage and transmission of biometric identifiers.",
    citation: "Tex. Bus. & Com. Code § 503.001(c)(2)",
    verifyAgainst:
      "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
    lastVerified: "2026-06-28",
  },
  {
    id: "cubi-c3",
    subsection: "(c)(3)",
    topic: "Retention and destruction within a reasonable time after the collection purpose has been satisfied.",
    citation: "Tex. Bus. & Com. Code § 503.001(c)(3)",
    verifyAgainst:
      "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
    lastVerified: "2026-06-28",
  },
  {
    id: "cubi-d",
    subsection: "(d)",
    topic: "Civil penalty up to $25,000 per violation, enforceable by the Texas Attorney General.",
    citation: "Tex. Bus. & Com. Code § 503.001(d)",
    verifyAgainst:
      "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
    lastVerified: "2026-06-28",
  },
  {
    id: "cubi-e",
    subsection: "(e)",
    topic: "AI development exemption — CUBI does not apply to biometric data used solely to develop, train, evaluate, or offer AI models (effective Jan 1, 2026, added by HB 149/TRAIGA).",
    citation: "Tex. Bus. & Com. Code § 503.001(e)",
    effectiveFrom: "2026-01-01",
    verifyAgainst:
      "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
    lastVerified: "2026-06-28",
  },
];

export function renderCubiSubsections(): string {
  const lines: string[] = [
    "TEXAS CUBI — SUBSECTION MAP (authoritative; never invent letter references):",
  ];
  for (const s of CUBI_SUBSECTIONS) {
    const eff = s.effectiveFrom ? ` [effective ${s.effectiveFrom}]` : "";
    lines.push(`- ${s.citation}${eff}: ${s.topic}`);
  }
  lines.push(
    "Never cite the penalty as § 503.001(e) — that is the AI exemption. Never cite security as § 503.001(d) — that is the penalty. If uncertain of a specific subsection, write the obligation descriptively and add \"[subsection reference to be confirmed with counsel]\" rather than inventing a letter.",
  );
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────
// Florida FDBR applicability
// ─────────────────────────────────────────────────────────────

export type FdbrThreshold = RegistryEntry & {
  revenueFloor: string;
  platformCriteria: string[];
};

export const FDBR_THRESHOLD: FdbrThreshold = {
  id: "fdbr-applicability",
  citation: "Fla. Stat. § 501.702 et seq. (Florida Digital Bill of Rights)",
  revenueFloor: "$1 billion in global annual revenue",
  platformCriteria: [
    "Operates an online marketplace with 10M+ monthly active US users",
    "Operates a search engine",
    "Operates a social media platform",
    "Operates an app store",
    "Operates a voice-operated operating system",
    "Operates a web browser",
  ],
  verifyAgainst:
    "http://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599/0501/0501.html",
  lastVerified: "2026-06-28",
};

export function renderFdbrApplicability(): string {
  const t = FDBR_THRESHOLD;
  const lines = [
    `FLORIDA FDBR — APPLICABILITY (${t.citation}):`,
    `- Applies ONLY to "controllers" that meet ALL of:`,
    `  (a) conduct business in Florida OR produce products/services targeted to Florida consumers, AND`,
    `  (b) have ${t.revenueFloor}, AND`,
    `  (c) meet at least one platform criterion: ${t.platformCriteria.map((c) => `"${c}"`).join("; ")}.`,
    "- The 100,000-consumer or 25,000-consumer thresholds from other state privacy laws (e.g. Virginia, Colorado) do NOT determine FDBR applicability.",
    "- If revenue is not stated or platform criteria are not met, state FDBR is likely inapplicable and explain why using the actual statutory criteria.",
  ];
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────
// BIPA core citations + Clay v. Union Pacific
// ─────────────────────────────────────────────────────────────

export type BipaCitation = RegistryEntry & {
  shortName: string;
  description: string;
};

export const BIPA_CITATIONS: BipaCitation[] = [
  {
    id: "bipa-15a",
    shortName: "BIPA § 15(a)",
    citation: "740 ILCS 14/15(a)",
    description:
      "Written, publicly available retention schedule and destruction guidelines for biometric identifiers and information.",
    verifyAgainst: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
    lastVerified: "2026-06-28",
  },
  {
    id: "bipa-15b",
    shortName: "BIPA § 15(b)",
    citation: "740 ILCS 14/15(b)",
    description:
      "Informed written consent before collection, including written release; written notice of purpose and length of term.",
    verifyAgainst: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
    lastVerified: "2026-06-28",
  },
  {
    id: "bipa-15d",
    shortName: "BIPA § 15(d)",
    citation: "740 ILCS 14/15(d)",
    description:
      "Prohibition on disclosure, redisclosure, or dissemination of biometric data without consent or another listed exception.",
    verifyAgainst: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
    lastVerified: "2026-06-28",
  },
  {
    id: "bipa-20",
    shortName: "BIPA § 20",
    citation: "740 ILCS 14/20",
    description:
      "Private right of action; liquidated damages of $1,000 (negligent) or $5,000 (intentional/reckless) per violation, plus attorneys' fees.",
    verifyAgainst: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
    lastVerified: "2026-06-28",
  },
  {
    id: "bipa-cothron-2023",
    shortName: "Cothron v. White Castle",
    citation: "Cothron v. White Castle Sys., Inc., 2023 IL 128004 (Ill. Feb. 17, 2023)",
    description:
      "Illinois Supreme Court held each scan/transmission is a separate BIPA violation. Subsequently capped by P.A. 103-0769 for post-Aug 2, 2024 conduct.",
    verifyAgainst:
      "https://courts.illinois.gov/Opinion/getOpinion?writID=128004",
    lastVerified: "2026-06-28",
  },
  {
    id: "bipa-clay-2026",
    shortName: "Clay v. Union Pacific",
    citation:
      "Clay v. Union Pacific Railroad Co., No. 25-2185, 2026 WL 891902 (7th Cir. Apr. 1, 2026)",
    description:
      "Seventh Circuit (consolidated with Gregg v. Central Transport LLC and Willis v. Universal Intermodal Services) held P.A. 103-0769 is remedial/procedural and applies retroactively, limiting pre-amendment conduct to one recovery per person in federal court. Illinois state courts are not bound by the Seventh Circuit on this question of Illinois law; the Illinois Supreme Court has not addressed retroactivity, so residual per-scan exposure in state court cannot be fully excluded. Always cite as Clay (lead case); do NOT use Gregg as the primary citation.",
    verifyAgainst: "https://www.ca7.uscourts.gov/opinion.htm",
    lastVerified: "2026-06-28",
  },
];

export function renderBipaCitations(): string {
  const lines: string[] = [
    "BIPA — CORE CITATIONS (authoritative; never invent section letters or case docket numbers):",
  ];
  for (const c of BIPA_CITATIONS) {
    lines.push(`- ${c.shortName} — ${c.citation}: ${c.description}`);
  }
  lines.push(
    "When referencing the Seventh Circuit's BIPA retroactivity ruling, always cite Clay v. Union Pacific (lead case). Frame pre-amendment exposure as substantially reduced in federal court by Clay with an unresolved residual risk in Illinois state court — NOT as an open federal split.",
  );
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────
// Aggregate accessor — used by R5 (verify-registry) to walk every entry.
// ─────────────────────────────────────────────────────────────

export type AnyStatutoryEntry = RegistryEntry & { source: string };

export function allStatutoryEntries(): AnyStatutoryEntry[] {
  return [
    ...PRA_BY_STATUTE.map((e) => ({ ...e, source: "PRA_BY_STATUTE" })),
    ...CUBI_SUBSECTIONS.map((e) => ({ ...e, source: "CUBI_SUBSECTIONS" })),
    { ...FDBR_THRESHOLD, source: "FDBR_THRESHOLD" },
    ...BIPA_CITATIONS.map((e) => ({ ...e, source: "BIPA_CITATIONS" })),
  ];
}
