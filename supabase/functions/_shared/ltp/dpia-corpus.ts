/**
 * DPIA UPGRADE (ITEM 4) — CORPUS INTO THE ANALYSIS for run-dpia-framework.
 *
 * The lia-corpus / admt-corpus / risk-corpus / governance-corpus pattern
 * applied to the Data Protection Impact Assessment product. ONE source only:
 * `provision_texts` rows resolved at runtime through the shared
 * `resolveProvisionForRender` closed-set resolver.
 *
 * ZERO COMPILED-IN STATUTORY TEXT. Nothing in this file contains an excerpt of
 * the Regulation. Art. 35 — including its threshold criteria in Art. 35(1) and
 * 35(3) and the content requirements in Art. 35(7) — arrives from an approved
 * corpus row at run time. A key that is not approved contributes NO excerpt: it
 * still appears, citation-only. Nothing is invented, nothing is silently
 * dropped.
 *
 * TEMPLATE DISCIPLINE. The EDPB DPIA template v1.0 (adopted 10 March 2026)
 * gives the document its SHAPE, and the CNIL PIA methodology gives it its
 * analytical engine. Neither is statutory authority: neither enters this
 * corpus, neither is quotable as law, and `isAllowedDpiaCitation` will never
 * approve either.
 *
 * CODE-OWNED MODEL. The r1–r9 risk catalogue in
 * `_shared/ltp/dpia-deliverables/elements.ts` is an ANALYTIC MODEL, not
 * statutory text. It stays code-owned and is deliberately absent from this
 * corpus.
 */
import { resolveProvisionForRender } from "../provision-store.ts";

type SupabaseClient = { from: (table: string) => unknown };

export const DPIA_CORPUS_VERSION = "dpia-corpus@2026-08-05-upgrade6";

/**
 * The statutory spine of a DPIA:
 *   Art. 35 — the obligation, the Art. 35(1)/35(3) threshold criteria, the
 *             Art. 35(7) minimum content, and the Art. 35(9) views of data
 *             subjects.
 *   Art. 36 — prior consultation, relied on by the `art36_consultation`
 *             deliverable.
 */
export const DPIA_CORPUS_KEYS: readonly string[] = [
  "gdpr-art-35",
  "gdpr-art-36",
];

/** Art. 35 supplies the standard every DPIA finding is measured against. */
export const DPIA_SPINE_KEY = "gdpr-art-35";

export interface DpiaCorpusProvision {
  readonly key: string;
  readonly citation: string;
  readonly status: "approved" | "pending" | "unknown_inserted";
  readonly verbatim_excerpt: string;
  readonly plain_requirements: readonly string[];
}

export interface DpiaCorpus {
  readonly version: string;
  readonly provisions: readonly DpiaCorpusProvision[];
  readonly resolved_count: number;
  readonly approved_count: number;
}

export const EMPTY_DPIA_CORPUS: DpiaCorpus = {
  version: DPIA_CORPUS_VERSION,
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

/** Resolve the DPIA corpus at runtime. Never throws; degrades to empty. */
export async function fetchDpiaCorpus(db: unknown): Promise<DpiaCorpus> {
  if (!db) return EMPTY_DPIA_CORPUS;

  const provisions: DpiaCorpusProvision[] = [];
  for (const key of DPIA_CORPUS_KEYS) {
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
        `[dpia-corpus] resolve failed for ${key} (non-fatal):`,
        (e as Error)?.message,
      );
    }
  }

  return {
    version: DPIA_CORPUS_VERSION,
    provisions,
    resolved_count: provisions.length,
    approved_count: provisions.filter((p) => p.status === "approved" && p.verbatim_excerpt).length,
  };
}

/**
 * The CORPUS LAW BLOCK handed to the DPIA synthesis prompt. Approved rows carry
 * their verbatim text; everything else is named citation-only so the model can
 * never treat it as quotable.
 */
export function buildDpiaCorpusLawBlock(
  corpus: DpiaCorpus | null | undefined,
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
    "CORPUS LAW BLOCK — the DPIA statutory spine: Art. 35 (obligation,",
    "threshold criteria, minimum content) and Art. 36 (prior consultation).",
    "Only the VERBATIM text below may be quoted. Anything shown as CITATION ONLY",
    "must be cited without quotation. Never paraphrase a quote as though it were",
    "verbatim, and never invent article or paragraph text.",
    "Template and methodology material — the EDPB DPIA template v1.0 (adopted",
    "10 March 2026) and the CNIL PIA methodology — supplies the document's",
    "structure and analytic method. It is NOT authority: never cite it as a",
    "legal basis and never present it as binding.",
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
    "THE ASSESSMENT ORDER. Art. 35(1) and 35(3) settle whether an assessment is",
    "required and on what criterion; Art. 35(7) sets the minimum content the",
    "assessment must contain — the systematic description, the necessity and",
    "proportionality assessment, the risks to the rights and freedoms of data",
    "subjects, and the measures envisaged to address them; Art. 36(1) is reached",
    "only from residual risk that remains high after those measures. A record",
    "that cannot answer a requirement is reported as insufficient, not inferred.",
  );
  return parts.join("\n");
}

/**
 * DPIA equivalent of `isAllowedGovernanceCitation`: a citation may be presented
 * as corpus-pinned ONLY when it resolves to an approved provision row in this
 * corpus. EDPB template and CNIL methodology references can never satisfy this
 * test.
 */
export function isAllowedDpiaCitation(
  citation: string,
  corpus: DpiaCorpus | null | undefined,
): boolean {
  const c = norm(citation).toLowerCase();
  if (!c) return false;
  if (/\bcnil\b|\bpia\b|dpia template|template \[?2026\]?|explainer/i.test(c)) return false;
  for (const p of corpus?.provisions ?? []) {
    if (p.status !== "approved" || !p.verbatim_excerpt) continue;
    const base = norm(p.citation).toLowerCase();
    // Corpus citations carry a source suffix, e.g. "GDPR Art. 35 (Regulation
    // (EU) 2016/679, ...)"; match on the leading article form either way.
    const head = base.split(" (")[0];
    if (head && (c.startsWith(head) || head.startsWith(c))) return true;
  }
  return false;
}

/** Approved rows in the shape `buildAuthorityExhibit` expects. */
export function dpiaCorpusProvisionsForExhibit(
  corpus: DpiaCorpus | null | undefined,
): { key: string; citation: string; verbatim_excerpt: string; status: string }[] {
  return (corpus?.provisions ?? [])
    .filter((p) => p.status === "approved" && p.verbatim_excerpt)
    .map((p) => ({
      key: p.key,
      // Corpus citations carry a source suffix — "GDPR Art. 35 (Regulation (EU)
      // 2016/679, CELEX 32016R0679)". The exhibit matches on the citation as it
      // appears in the report, so the suffix is trimmed here.
      citation: p.citation.split(" (")[0].trim() || p.citation,
      verbatim_excerpt: p.verbatim_excerpt,
      status: "approved",
    }));
}
