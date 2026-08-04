/**
 * GOVERNANCE UPGRADE (ITEM 5) — CORPUS INTO THE ANALYSIS for
 * run-governance-assessment.
 *
 * The lia-corpus / admt-corpus / risk-corpus pattern applied to the GDPR
 * governance product. ONE source only: `provision_texts` rows resolved at
 * runtime through the shared `resolveProvisionForRender` closed-set resolver.
 *
 * ZERO COMPILED-IN STATUTORY TEXT. Nothing in this file contains an excerpt of
 * the Regulation; every quotable string arrives from an approved corpus row at
 * run time. A key that is not approved contributes NO excerpt — it still
 * appears, citation-only. Nothing is invented, nothing is silently dropped.
 *
 * ICO DISCIPLINE. The ICO Data Protection Audit Framework (Oct 2024) shapes the
 * per-domain tracker questions the intake rail shows. It is TEMPLATE GUIDANCE
 * ONLY and never enters this corpus: it is not asserted as authority, it is not
 * quotable, and `isAllowedGovernanceCitation` will never approve it.
 */
import { resolveProvisionForRender } from "../provision-store.ts";

type SupabaseClient = { from: (table: string) => unknown };

export const GOVERNANCE_CORPUS_VERSION = "governance-corpus@2026-08-04-upgrade5";

/**
 * The statutory spine of a GDPR governance assessment:
 *   Art. 5(2)  — accountability (the demonstrability standard)
 *   Art. 24    — controller responsibility, risk calibration, review-and-update
 *   Art. 30    — records of processing activities (and the 30(5) exemption)
 *   Arts. 37–39 — DPO designation, position, tasks
 */
export const GOVERNANCE_CORPUS_KEYS: readonly string[] = [
  "gdpr-art-5-2",
  "gdpr-art-24",
  "gdpr-art-30",
  "gdpr-art-37",
  "gdpr-art-38",
  "gdpr-art-39",
];

/** Art. 5(2) supplies the standard every governance finding is measured against. */
export const GOVERNANCE_SPINE_KEY = "gdpr-art-5-2";

export interface GovernanceCorpusProvision {
  readonly key: string;
  readonly citation: string;
  readonly status: "approved" | "pending" | "unknown_inserted";
  readonly verbatim_excerpt: string;
  readonly plain_requirements: readonly string[];
}

export interface GovernanceCorpus {
  readonly version: string;
  readonly provisions: readonly GovernanceCorpusProvision[];
  readonly resolved_count: number;
  readonly approved_count: number;
}

export const EMPTY_GOVERNANCE_CORPUS: GovernanceCorpus = {
  version: GOVERNANCE_CORPUS_VERSION,
  provisions: [],
  resolved_count: 0,
  approved_count: 0,
};

function asStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) =>
      typeof x === "string"
        ? x
        : typeof x === "object" && x
        ? String((x as Record<string, unknown>).text ?? "")
        : ""
    )
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

function norm(s: string): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

/** Resolve the governance corpus at runtime. Never throws; degrades to empty. */
export async function fetchGovernanceCorpus(db: unknown): Promise<GovernanceCorpus> {
  if (!db) return EMPTY_GOVERNANCE_CORPUS;

  const provisions: GovernanceCorpusProvision[] = [];
  for (const key of GOVERNANCE_CORPUS_KEYS) {
    try {
      const r = await resolveProvisionForRender(db as SupabaseClient as never, key);
      provisions.push({
        key,
        citation: r.citation ?? key,
        status: r.status,
        verbatim_excerpt: r.excerpt ?? "",
        plain_requirements: asStrings(r.plain_requirements),
      });
    } catch (e) {
      console.warn(
        `[governance-corpus] resolve failed for ${key} (non-fatal):`,
        (e as Error)?.message,
      );
    }
  }

  return {
    version: GOVERNANCE_CORPUS_VERSION,
    provisions,
    resolved_count: provisions.length,
    approved_count: provisions.filter((p) => p.status === "approved" && p.verbatim_excerpt).length,
  };
}

/**
 * The CORPUS LAW BLOCK handed to the governance synthesis prompt. Approved rows
 * carry their verbatim text; everything else is named citation-only so the model
 * can never treat it as quotable.
 */
export function buildGovernanceCorpusLawBlock(
  corpus: GovernanceCorpus | null | undefined,
): string {
  const rows = corpus?.provisions ?? [];
  if (rows.length === 0) {
    return [
      "CORPUS LAW BLOCK — UNAVAILABLE.",
      "No provision text resolved for this run. Do not quote any statutory or",
      "regulatory text. Cite by article number only, and say plainly where the",
      "record cannot support a conclusion.",
    ].join("\n");
  }

  const parts: string[] = [
    "CORPUS LAW BLOCK — the GDPR accountability spine: Art. 5(2), Art. 24,",
    "Art. 30 and Arts. 37-39.",
    "Only the VERBATIM text below may be quoted. Anything shown as CITATION ONLY",
    "must be cited without quotation. Never paraphrase a quote as though it were",
    "verbatim, and never invent article or paragraph text.",
    "Audit-framework material (including the ICO Data Protection Audit Framework)",
    "is drafting guidance for the customer's own tracker. It is NOT authority:",
    "never cite it as a legal basis and never present it as binding.",
    "",
  ];

  for (const p of rows) {
    if (p.status === "approved" && p.verbatim_excerpt) {
      parts.push(`### ${p.citation} — VERBATIM (corpus key ${p.key})`);
      parts.push(p.verbatim_excerpt);
      if (p.plain_requirements.length > 0) {
        parts.push("Requirements this provision imposes:");
        for (const r of p.plain_requirements) parts.push(`- ${r}`);
      }
    } else {
      parts.push(`### ${p.citation} — CITATION ONLY (no approved corpus text)`);
    }
    parts.push("");
  }

  parts.push(
    "THE ACCOUNTABILITY ORDER. Art. 5(2) sets the standard the organisation must",
    "be able to demonstrate; Art. 24 asks whether the measures are calibrated to",
    "the nature, scope, context and purposes of the processing and are reviewed;",
    "Art. 30 and Arts. 37-39 are discrete duties tested on their own terms. A",
    "record that cannot answer a duty is reported as insufficient, not inferred.",
  );
  return parts.join("\n");
}

/**
 * Governance equivalent of `isAllowedLiaCitation`: a citation may be presented
 * as corpus-pinned ONLY when it resolves to an approved provision row in this
 * corpus. ICO framework references can never satisfy this test.
 */
export function isAllowedGovernanceCitation(
  citation: string,
  corpus: GovernanceCorpus | null | undefined,
): boolean {
  const c = norm(citation).toLowerCase();
  if (!c) return false;
  if (/\bico\b|audit framework|toolkit|tracker/i.test(c)) return false;
  for (const p of corpus?.provisions ?? []) {
    if (p.status !== "approved" || !p.verbatim_excerpt) continue;
    const base = norm(p.citation).toLowerCase();
    // Corpus citations carry a source suffix, e.g. "GDPR Art. 24 (Regulation
    // (EU) 2016/679, ...)"; match on the leading article form either way.
    const head = base.split(" (")[0];
    if (head && (c.startsWith(head) || head.startsWith(c))) return true;
  }
  return false;
}

/** Approved rows in the shape `buildAuthorityExhibit` expects. */
export function governanceCorpusProvisionsForExhibit(
  corpus: GovernanceCorpus | null | undefined,
): { key: string; citation: string; verbatim_excerpt: string; status: string }[] {
  return (corpus?.provisions ?? [])
    .filter((p) => p.status === "approved" && p.verbatim_excerpt)
    .map((p) => ({
      key: p.key,
      // Corpus citations carry a source suffix — "GDPR Art. 24 (Regulation (EU)
      // 2016/679, CELEX 32016R0679)". The exhibit matches on the citation as it
      // appears in the report, so the suffix is trimmed here.
      citation: p.citation.split(" (")[0].trim() || p.citation,
      verbatim_excerpt: p.verbatim_excerpt,
      status: "approved",
    }));
}
