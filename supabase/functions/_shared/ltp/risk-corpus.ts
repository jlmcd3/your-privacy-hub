/**
 * UPGRADE-2 (ITEM 2) — CORPUS INTO THE ANALYSIS for cppa-risk.
 *
 * The cyber Item-371 pattern, applied to the risk product. At runtime we
 * resolve §§ 7150–7157 from `provision_texts` through the shared
 * `resolveProvisionForRender` closed-set resolver, and expose:
 *
 *   • a CORPUS LAW BLOCK — verbatim excerpts + plain_requirements — for
 *     Pass-1 and Pass-2R prompt assembly;
 *   • the approved provision rows the Authority Exhibit may excerpt from;
 *   • a citation allow-list (the risk equivalent of
 *     isAllowedCyberCitation) so no § outside the resolved corpus is
 *     presented as though it were pinned.
 *
 * HONEST DEGRADATION: a key that is not approved contributes NO excerpt.
 * It still appears, citation-only, with the pending notice. Nothing is
 * invented and nothing is silently dropped.
 */
import { resolveProvisionForRender } from "../provision-store.ts";

type SupabaseClient = { from: (table: string) => unknown };

export const RISK_CORPUS_VERSION = "risk-corpus@2026-08-03-upgrade2";

/** The governing chapter for a CPPA risk assessment. § 7152 is the spine. */
export const RISK_CORPUS_KEYS: readonly string[] = [
  "cppa-7150",
  "cppa-7151",
  "cppa-7152",
  "cppa-7153",
  "cppa-7154",
  "cppa-7155",
  "cppa-7156",
  "cppa-7157",
];

/** § 7152 is the narrative spine — its plain_requirements are the testable elements. */
export const RISK_SPINE_KEY = "cppa-7152";

export interface RiskCorpusProvision {
  readonly key: string;
  readonly citation: string;
  readonly status: "approved" | "pending" | "unknown_inserted";
  readonly verbatim_excerpt: string;
  readonly plain_requirements: readonly string[];
}

export interface RiskCorpus {
  readonly version: string;
  readonly provisions: readonly RiskCorpusProvision[];
  /** The § 7152 plain_requirements — the elements the deliverables must cover. */
  readonly spine_requirements: readonly string[];
  readonly resolved_count: number;
  readonly approved_count: number;
}

export const EMPTY_RISK_CORPUS: RiskCorpus = {
  version: RISK_CORPUS_VERSION,
  provisions: [],
  spine_requirements: [],
  resolved_count: 0,
  approved_count: 0,
};

function asStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x : typeof x === "object" && x ? String((x as Record<string, unknown>).text ?? "") : ""))
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

/** Resolve the risk corpus at runtime. Never throws; degrades to EMPTY_RISK_CORPUS. */
export async function fetchRiskCorpus(db: unknown): Promise<RiskCorpus> {
  if (!db) return EMPTY_RISK_CORPUS;
  const provisions: RiskCorpusProvision[] = [];
  for (const key of RISK_CORPUS_KEYS) {
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
      console.warn(`[risk-corpus] resolve failed for ${key} (non-fatal):`, (e as Error)?.message);
    }
  }
  const spine = provisions.find((p) => p.key === RISK_SPINE_KEY);
  return {
    version: RISK_CORPUS_VERSION,
    provisions,
    spine_requirements: spine?.plain_requirements ?? [],
    resolved_count: provisions.length,
    approved_count: provisions.filter((p) => p.status === "approved" && p.verbatim_excerpt).length,
  };
}

/**
 * The CORPUS LAW BLOCK handed to Pass-1 / Pass-2R prompt assembly.
 * Approved rows carry their verbatim text; everything else is named
 * citation-only so the model can never treat it as quotable.
 */
export function buildRiskCorpusLawBlock(corpus: RiskCorpus | null | undefined): string {
  const rows = corpus?.provisions ?? [];
  if (rows.length === 0) {
    return [
      "CORPUS LAW BLOCK — UNAVAILABLE.",
      "No provision text resolved for this run. Do not quote any statutory or",
      "regulatory text. Cite by section number only, and say plainly where the",
      "record cannot support a conclusion.",
    ].join("\n");
  }
  const parts: string[] = [
    "CORPUS LAW BLOCK — 11 CCR §§ 7150-7157 (California Privacy Protection Agency).",
    "Only the VERBATIM text below may be quoted. Any section shown as",
    "citation-only must be cited without quotation. Never paraphrase a quote as",
    "though it were verbatim, and never invent subdivision text.",
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
  const spine = corpus?.spine_requirements ?? [];
  if (spine.length > 0) {
    parts.push("TESTABLE ELEMENTS — every one of the following § 7152 requirements must be");
    parts.push("covered by a deliverable or answered as record-insufficient. None may be skipped:");
    spine.forEach((r, i) => parts.push(`${i + 1}. ${r}`));
  }
  return parts.join("\n");
}

/**
 * Risk equivalent of `isAllowedCyberCitation`: a citation may be presented as
 * corpus-pinned ONLY when it resolves to an approved row in this corpus.
 */
export function isAllowedRiskCitation(
  citation: string,
  corpus: RiskCorpus | null | undefined,
): boolean {
  const c = (citation || "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!c) return false;
  for (const p of corpus?.provisions ?? []) {
    if (p.status !== "approved" || !p.verbatim_excerpt) continue;
    const base = (p.citation || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (base && c.startsWith(base)) return true;
    const num = p.key.replace(/^cppa-/, "");
    if (num && c.includes(`§ ${num}`)) return true;
  }
  return false;
}

/** Approved rows in the shape `buildAuthorityExhibit` expects. */
export function riskCorpusProvisionsForExhibit(
  corpus: RiskCorpus | null | undefined,
): { key: string; citation: string; verbatim_excerpt: string; status: string }[] {
  return (corpus?.provisions ?? [])
    .filter((p) => p.status === "approved" && p.verbatim_excerpt)
    .map((p) => ({
      key: p.key,
      citation: p.citation,
      verbatim_excerpt: p.verbatim_excerpt,
      status: "approved",
    }));
}
