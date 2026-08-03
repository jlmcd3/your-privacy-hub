/**
 * UPGRADE-3 (ITEM 5) — CORPUS INTO THE ANALYSIS for cppa-admt.
 *
 * The cyber Item-371 / risk Upgrade-2 pattern, applied to the ADMT product.
 * At runtime we resolve §§ 7220–7222 (+ the § 7001 definitions row) from
 * `provision_texts` through the shared `resolveProvisionForRender` closed-set
 * resolver, and expose:
 *
 *   • a CORPUS LAW BLOCK — verbatim excerpts + plain_requirements — for the
 *     gap-analysis prompt assembly;
 *   • the approved provision rows the Authority Exhibit may excerpt from;
 *   • a citation allow-list (the ADMT equivalent of isAllowedCyberCitation /
 *     isAllowedRiskCitation) so no § outside the resolved corpus is presented
 *     as though it were pinned.
 *
 * HONEST DEGRADATION: a key that is not approved contributes NO excerpt. It
 * still appears, citation-only. Nothing is invented, nothing silently dropped.
 */
import { resolveProvisionForRender } from "../provision-store.ts";

type SupabaseClient = { from: (table: string) => unknown };

export const ADMT_CORPUS_VERSION = "admt-corpus@2026-08-03-upgrade3";

/** The governing chapter for an ADMT compliance assessment. */
export const ADMT_CORPUS_KEYS: readonly string[] = [
  "cppa-7001",
  "cppa-7220",
  "cppa-7221",
  "cppa-7222",
];

/** § 7222 supplies the testable elements for the access-rights section. */
export const ADMT_ACCESS_SPINE_KEY = "cppa-7222";
/** § 7220 supplies the testable elements for the pre-use-notice section. */
export const ADMT_NOTICE_SPINE_KEY = "cppa-7220";

export interface AdmtCorpusProvision {
  readonly key: string;
  readonly citation: string;
  readonly status: "approved" | "pending" | "unknown_inserted";
  readonly verbatim_excerpt: string;
  readonly plain_requirements: readonly string[];
}

export interface AdmtCorpus {
  readonly version: string;
  readonly provisions: readonly AdmtCorpusProvision[];
  /** § 7222 plain_requirements — the elements the access findings must cover. */
  readonly access_requirements: readonly string[];
  /** § 7220 plain_requirements — the elements the notice findings must cover. */
  readonly notice_requirements: readonly string[];
  readonly resolved_count: number;
  readonly approved_count: number;
}

export const EMPTY_ADMT_CORPUS: AdmtCorpus = {
  version: ADMT_CORPUS_VERSION,
  provisions: [],
  access_requirements: [],
  notice_requirements: [],
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

/** Resolve the ADMT corpus at runtime. Never throws; degrades to EMPTY_ADMT_CORPUS. */
export async function fetchAdmtCorpus(db: unknown): Promise<AdmtCorpus> {
  if (!db) return EMPTY_ADMT_CORPUS;
  const provisions: AdmtCorpusProvision[] = [];
  for (const key of ADMT_CORPUS_KEYS) {
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
      console.warn(`[admt-corpus] resolve failed for ${key} (non-fatal):`, (e as Error)?.message);
    }
  }
  const access = provisions.find((p) => p.key === ADMT_ACCESS_SPINE_KEY);
  const notice = provisions.find((p) => p.key === ADMT_NOTICE_SPINE_KEY);
  return {
    version: ADMT_CORPUS_VERSION,
    provisions,
    access_requirements: access?.plain_requirements ?? [],
    notice_requirements: notice?.plain_requirements ?? [],
    resolved_count: provisions.length,
    approved_count: provisions.filter((p) => p.status === "approved" && p.verbatim_excerpt).length,
  };
}

/**
 * The CORPUS LAW BLOCK handed to the gap-analysis prompt. Approved rows carry
 * their verbatim text; everything else is named citation-only so the model can
 * never treat it as quotable.
 */
export function buildAdmtCorpusLawBlock(corpus: AdmtCorpus | null | undefined): string {
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
    "CORPUS LAW BLOCK — 11 CCR §§ 7001, 7220-7222 (California Privacy Protection Agency).",
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
  const access = corpus?.access_requirements ?? [];
  if (access.length > 0) {
    parts.push("TESTABLE ELEMENTS — § 7222 (right to access ADMT). Every one of the");
    parts.push("following must be covered by a finding or answered as record-insufficient:");
    access.forEach((r, i) => parts.push(`${i + 1}. ${r}`));
  }
  return parts.join("\n");
}

/**
 * ADMT equivalent of `isAllowedCyberCitation`: a citation may be presented as
 * corpus-pinned ONLY when it resolves to an approved row in this corpus.
 */
export function isAllowedAdmtCitation(
  citation: string,
  corpus: AdmtCorpus | null | undefined,
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
export function admtCorpusProvisionsForExhibit(
  corpus: AdmtCorpus | null | undefined,
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
