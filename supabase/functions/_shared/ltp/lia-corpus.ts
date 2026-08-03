/**
 * UPGRADE-4 (ITEM 3) — CORPUS INTO THE ANALYSIS for run-li-assessment.
 *
 * The risk Upgrade-2 / ADMT Upgrade-3 pattern, applied to the LIA product.
 * Two sources, kept apart because they are pinned differently:
 *
 *   1. STATUTE — `provision_texts` rows resolved at runtime through the shared
 *      `resolveProvisionForRender` closed-set resolver. `gdpr-art-6-1-f` is the
 *      spine; Recital 47 and the Art. 5 principles support the balancing and
 *      necessity limbs, and Arts. 13/14 carry the objection-information duty.
 *
 *   2. EDPB GUIDELINES 1/2024 — the pinned excerpts the deliverables actually
 *      rely on. These come from `registry/lia-verified-authorities.ts`, whose
 *      `verbatim_quote` values are byte-exact substrings of approved
 *      `edpb_guidelines` rows (LIA-REGISTRY-AUTHORING pin tests). At runtime we
 *      re-verify each pin by substring containment against the live corpus, so
 *      a drifted registry row degrades to citation-only rather than shipping
 *      an unverified quote.
 *
 * HONEST DEGRADATION: a key that is not approved contributes NO excerpt. It
 * still appears, citation-only. Nothing is invented, nothing silently dropped.
 */
import { resolveProvisionForRender } from "../provision-store.ts";
import { LIA_VERIFIED_AUTHORITIES } from "../registry/lia-verified-authorities.ts";

type SupabaseClient = { from: (table: string) => unknown };

export const LIA_CORPUS_VERSION = "lia-corpus@2026-08-03-upgrade4";

/** The statutory spine of a legitimate interests assessment. */
export const LIA_CORPUS_KEYS: readonly string[] = [
  "gdpr-art-6-1-f",
  "gdpr-recital-47",
  "gdpr-art-5-1-b",
  "gdpr-art-5-1-c",
  "gdpr-art-13",
  "gdpr-art-14",
];

/** Art. 6(1)(f) supplies the testable elements for the three-part arc. */
export const LIA_SPINE_KEY = "gdpr-art-6-1-f";

/** The guidance reference whose excerpts this product pins. */
export const EDPB_1_2024_REF = "EDPB Guidelines 1/2024";

export interface LiaCorpusProvision {
  readonly key: string;
  readonly citation: string;
  readonly status: "approved" | "pending" | "unknown_inserted";
  readonly verbatim_excerpt: string;
  readonly plain_requirements: readonly string[];
}

export interface LiaGuidanceExcerpt {
  /** Registry proposition key — the deliverable that relies on it. */
  readonly proposition_key: string;
  /** Pinpoint citation, e.g. "EDPB Guidelines 1/2024, Section II.C.3". */
  readonly citation: string;
  /** Byte-exact registry quote. */
  readonly verbatim: string;
  /** True when the quote was found verbatim in an approved corpus row. */
  readonly pin_verified: boolean;
}

export interface LiaCorpus {
  readonly version: string;
  readonly provisions: readonly LiaCorpusProvision[];
  readonly guidance: readonly LiaGuidanceExcerpt[];
  readonly resolved_count: number;
  readonly approved_count: number;
  readonly guidance_verified_count: number;
}

export const EMPTY_LIA_CORPUS: LiaCorpus = {
  version: LIA_CORPUS_VERSION,
  provisions: [],
  guidance: [],
  resolved_count: 0,
  approved_count: 0,
  guidance_verified_count: 0,
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

/** The EDPB 1/2024 registry rows this product relies on, in emitted order. */
export function edpb12024RegistryRows(): {
  proposition_key: string;
  citation: string;
  verbatim: string;
}[] {
  const out: { proposition_key: string; citation: string; verbatim: string }[] = [];
  for (const key of Object.keys(LIA_VERIFIED_AUTHORITIES)) {
    const r = (LIA_VERIFIED_AUTHORITIES as Record<string, any>)[key];
    const cite = String(r?.subsection ?? r?.citation ?? "");
    if (!cite.startsWith(EDPB_1_2024_REF)) continue;
    const verbatim = norm(String(r?.verbatim_quote ?? ""));
    if (!verbatim) continue;
    out.push({ proposition_key: key, citation: cite, verbatim });
  }
  return out.sort((a, b) => a.citation.localeCompare(b.citation, "en"));
}

/** Resolve the LIA corpus at runtime. Never throws; degrades to EMPTY_LIA_CORPUS. */
export async function fetchLiaCorpus(db: unknown): Promise<LiaCorpus> {
  if (!db) return EMPTY_LIA_CORPUS;

  const provisions: LiaCorpusProvision[] = [];
  for (const key of LIA_CORPUS_KEYS) {
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
      console.warn(`[lia-corpus] resolve failed for ${key} (non-fatal):`, (e as Error)?.message);
    }
  }

  // EDPB 1/2024 pin re-verification against the live corpus.
  let haystack = "";
  try {
    const { data } = await (db as any)
      .from("edpb_guidelines")
      .select("excerpt_text")
      .eq("guideline_ref", EDPB_1_2024_REF)
      .eq("status", "final")
      .limit(500);
    haystack = ((data ?? []) as Array<{ excerpt_text: string | null }>)
      .map((r) => norm(r.excerpt_text ?? ""))
      .join("\n");
  } catch (e) {
    console.warn("[lia-corpus] edpb_guidelines fetch failed (non-fatal):", (e as Error)?.message);
  }

  const guidance: LiaGuidanceExcerpt[] = edpb12024RegistryRows().map((r) => ({
    proposition_key: r.proposition_key,
    citation: r.citation,
    verbatim: r.verbatim,
    pin_verified: haystack.length > 0 && haystack.includes(r.verbatim),
  }));

  return {
    version: LIA_CORPUS_VERSION,
    provisions,
    guidance,
    resolved_count: provisions.length,
    approved_count: provisions.filter((p) => p.status === "approved" && p.verbatim_excerpt).length,
    guidance_verified_count: guidance.filter((g) => g.pin_verified).length,
  };
}

/**
 * The CORPUS LAW BLOCK handed to the LIA generation prompt. Approved rows and
 * pin-verified guidance carry their verbatim text; everything else is named
 * citation-only so the model can never treat it as quotable.
 */
export function buildLiaCorpusLawBlock(corpus: LiaCorpus | null | undefined): string {
  const rows = corpus?.provisions ?? [];
  const guidance = corpus?.guidance ?? [];
  if (rows.length === 0 && guidance.length === 0) {
    return [
      "CORPUS LAW BLOCK — UNAVAILABLE.",
      "No provision text resolved for this run. Do not quote any statutory,",
      "regulatory or guidance text. Cite by article, recital or section number",
      "only, and say plainly where the record cannot support a conclusion.",
    ].join("\n");
  }

  const parts: string[] = [
    "CORPUS LAW BLOCK — GDPR Art. 6(1)(f) and its supporting provisions, plus",
    "EDPB Guidelines 1/2024 on processing based on Article 6(1)(f).",
    "Only the VERBATIM text below may be quoted. Anything shown as CITATION ONLY",
    "must be cited without quotation. Never paraphrase a quote as though it were",
    "verbatim, and never invent article, recital or paragraph text.",
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

  if (guidance.length > 0) {
    parts.push(`### ${EDPB_1_2024_REF} — pinned excerpts`);
    for (const g of guidance) {
      if (g.pin_verified) {
        parts.push(`- ${g.citation} — VERBATIM: ${g.verbatim}`);
      } else {
        parts.push(`- ${g.citation} — CITATION ONLY (pin not verified this run)`);
      }
    }
    parts.push("");
  }

  parts.push(
    "THE THREE-PART ARC. Purpose, then necessity, then balancing, in that order.",
    "The three conditions in EDPB Guidelines 1/2024 are cumulative: a condition",
    "that fails is not offset by the other two.",
  );
  return parts.join("\n");
}

/**
 * LIA equivalent of `isAllowedAdmtCitation`: a citation may be presented as
 * corpus-pinned ONLY when it resolves to an approved provision row or a
 * pin-verified guidance excerpt in this corpus.
 */
export function isAllowedLiaCitation(
  citation: string,
  corpus: LiaCorpus | null | undefined,
): boolean {
  const c = norm(citation).toLowerCase();
  if (!c) return false;
  for (const p of corpus?.provisions ?? []) {
    if (p.status !== "approved" || !p.verbatim_excerpt) continue;
    const base = norm(p.citation).toLowerCase();
    if (base && c.startsWith(base)) return true;
  }
  for (const g of corpus?.guidance ?? []) {
    if (!g.pin_verified) continue;
    const base = norm(g.citation).toLowerCase();
    if (base && (c.startsWith(base) || base.startsWith(c))) return true;
  }
  return false;
}

/** Approved rows in the shape `buildAuthorityExhibit` expects. */
export function liaCorpusProvisionsForExhibit(
  corpus: LiaCorpus | null | undefined,
): { key: string; citation: string; verbatim_excerpt: string; status: string }[] {
  const out = (corpus?.provisions ?? [])
    .filter((p) => p.status === "approved" && p.verbatim_excerpt)
    .map((p) => ({
      key: p.key,
      citation: p.citation,
      verbatim_excerpt: p.verbatim_excerpt,
      status: "approved",
    }));
  // Pin-verified guidance excerpts are exhibit-eligible on the same footing:
  // the exhibit lists each authority once, keyed on its base citation.
  const seen = new Set<string>();
  for (const g of corpus?.guidance ?? []) {
    if (!g.pin_verified) continue;
    const base = g.citation.split(",")[0].trim();
    if (seen.has(base)) continue;
    seen.add(base);
    out.push({
      key: `edpb-1-2024:${g.proposition_key}`,
      citation: base,
      verbatim_excerpt: g.verbatim,
      status: "approved",
    });
  }
  return out;
}
