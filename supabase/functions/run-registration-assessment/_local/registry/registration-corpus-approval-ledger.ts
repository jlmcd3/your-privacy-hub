// CMP-B8 §1.2 — REGISTRATION CORPUS-KEY APPROVAL LEDGER (fail-loud).
//
// CEO-ratified ruling (61-CMP-B8-AUTHORITY-WING.md §1.2, gate cleared
// 2026-08-23): "a missing provision row currently degrades silently ...
// pin CI fails the BUILD when a key has no matching approved provision
// row — the gap class moves from runtime silence to CI failure."
//
// BEFORE THIS FILE, nothing enforced that class in a normal test run:
//   - `run-registration-assessment/index.ts`'s authority exhibit (lines
//     ~698-742) never queries `provision_texts`/`gdpr_articles` at all —
//     it fabricates a `CorpusProvision` for every `REGISTRATION_DUTY_
//     AUTHORITIES` row directly from the row's own hardcoded
//     `verbatim_quote`, unconditionally stamped `status: "approved"`. A
//     corpus_key that never had (or lost) an approved backing row would
//     render identically to one that does — nothing anywhere would know.
//   - `tests/edge/item413/reference-passages.test.ts` DOES fail loud on a
//     corpus_key absent from its own local mirror
//     (`registration-corpus-rows.json`) — but that mirror is a
//     hand-maintained snapshot dated 2026-08-08 that nothing ever
//     reconciles against the live tables again, so it does not, by
//     itself, prove current approval.
//   - The two tests that DO query the live DB
//     (`src/registry/__tests__/registration-statutes-corpus-pin.test.ts`,
//     `registration-rail-corpus-pin.test.ts`) are both
//     `describe.skipIf(!CAN_RUN)`, gated on `PGHOST`/`PGDATABASE`. In a
//     normal `deno test`/`vitest run` battery — the only way this repo's
//     tests are actually invoked — those env vars are unset, so the
//     block is SILENTLY SKIPPED (reported as zero tests, not a failure).
//     Neither test covers the three `gdpr-articles:*` keys at all.
//
// This ledger is the offline source of truth this file's assertion checks
// against. Every entry below was confirmed THIS SESSION (2026-08-26) via a
// live query against `provision_texts` (status='approved') and
// `gdpr_articles` (no approval workflow on that table — presence is
// authoritative) — project 75bce9a1-c7dc-4628-aea5-12baa2e26bf2, read-only,
// via the Lovable MCP `query_database` tool. Refresh this file (and its
// `verified_on` dates) whenever the corpus is re-ingested, re-approved, or
// a new corpus_key is added to `registration-verified-authorities.ts` —
// `registration-corpus-key-fail-loud.test.ts` fails the battery the moment
// the registry and this ledger drift apart, closing the gap class the
// ruling names. This file is NOT a Curated Attachment Map (no CAM exists
// for Registration yet — doc 78 §0/§3 confirms none should, pre-Conversion)
// — it is a narrower, non-render-affecting build guard over the existing
// pre-CAM registry.

export type RegistrationCorpusKeySource = "provision_texts" | "gdpr_articles";

export interface RegistrationApprovedCorpusKey {
  readonly source: RegistrationCorpusKeySource;
  readonly jurisdiction: string;
  /** Date this key's approval/presence was last confirmed live. */
  readonly verified_on: string;
}

export const REGISTRATION_APPROVED_CORPUS_KEYS: Readonly<
  Record<string, RegistrationApprovedCorpusKey>
> = {
  "ca-delete-act-1798-99-80": { source: "provision_texts", jurisdiction: "US-CA", verified_on: "2026-08-26" },
  "ca-delete-act-1798-99-82": { source: "provision_texts", jurisdiction: "US-CA", verified_on: "2026-08-26" },
  "ca-delete-act-1798-99-86": { source: "provision_texts", jurisdiction: "US-CA", verified_on: "2026-08-26" },
  "vt-9vsa-2430": { source: "provision_texts", jurisdiction: "US-VT", verified_on: "2026-08-26" },
  "vt-9vsa-2446": { source: "provision_texts", jurisdiction: "US-VT", verified_on: "2026-08-26" },
  "tx-bc-510-001": { source: "provision_texts", jurisdiction: "US-TX", verified_on: "2026-08-26" },
  "tx-bc-510-003": { source: "provision_texts", jurisdiction: "US-TX", verified_on: "2026-08-26" },
  "tx-bc-510-005": { source: "provision_texts", jurisdiction: "US-TX", verified_on: "2026-08-26" },
  "or-ors-646a-593": { source: "provision_texts", jurisdiction: "US-OR", verified_on: "2026-08-26" },
  "gdpr-articles:eu:27": { source: "gdpr_articles", jurisdiction: "EU", verified_on: "2026-08-26" },
  "gdpr-articles:uk:27": { source: "gdpr_articles", jurisdiction: "UK", verified_on: "2026-08-26" },
  "gdpr-articles:eu:37": { source: "gdpr_articles", jurisdiction: "EU", verified_on: "2026-08-26" },
  // DOC 163 (2026-09-03) — UK Art. 37 rows confirmed live (gdpr_articles,
  // jurisdiction 'uk', article_number '37') via the Lovable query_database
  // tool, project 75bce9a1-c7dc-4628-aea5-12baa2e26bf2.
  "gdpr-articles:uk:37": { source: "gdpr_articles", jurisdiction: "UK", verified_on: "2026-09-03" },
  // A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31, closes
  // Registration P0-3) — BDSG § 38 (Germany). Requires the matching
  // provision_texts row (key "de-bdsg-38", status='approved') to exist in
  // the live table before this entry is true; see registration-verified-
  // authorities.ts's dpo_trigger_bdsg_de row for the source and quote.
  "de-bdsg-38": { source: "provision_texts", jurisdiction: "DE", verified_on: "2026-08-31" },
  // REG-1 (doc 106, 2026-08-29) — EU AI Act rows. Ingested and approved
  // 2026-08-10 (found already present when doc 106 proposed ingesting them);
  // status='approved' confirmed live 2026-08-29 via Lovable query_database
  // against `provision_texts`, and the stored excerpts independently
  // re-verified against the EUR-Lex OJ publication the same day.
  "aiact-art-49": { source: "provision_texts", jurisdiction: "EU", verified_on: "2026-08-29" },
  "aiact-art-71": { source: "provision_texts", jurisdiction: "EU", verified_on: "2026-08-29" },
  "aiact-annex-8": { source: "provision_texts", jurisdiction: "EU", verified_on: "2026-08-29" },
};

/**
 * CMP-B8 §1.2 fail-loud check. Returns every distinct corpus_key referenced
 * by `rows` that has no entry in the approval ledger above — the exact
 * ratified failure class ("a key has no matching approved provision row").
 * An empty array means every referenced key resolves.
 */
export function findUnapprovedRegistrationCorpusKeys(
  rows: ReadonlyArray<{ readonly corpus_key: string }>,
): string[] {
  const missing = new Set<string>();
  for (const row of rows) {
    if (!REGISTRATION_APPROVED_CORPUS_KEYS[row.corpus_key]) missing.add(row.corpus_key);
  }
  return [...missing].sort();
}

/**
 * Throwing form, for use from a build-time/CI test (never from the request
 * path — this product's fail-open-loud law keeps a bad edit from ever
 * taking down live generation; this check belongs to the battery gate that
 * runs before a landing ships, not to `Deno.serve`'s handler).
 */
export function assertRegistrationCorpusKeysApproved(
  rows: ReadonlyArray<{ readonly corpus_key: string }>,
): void {
  const missing = findUnapprovedRegistrationCorpusKeys(rows);
  if (missing.length > 0) {
    throw new Error(
      `[registration-corpus-approval-ledger] CMP-B8 §1.2 fail-loud: corpus_key(s) with no approved provision row: ${missing.join(", ")}. ` +
        `Re-ingest and approve the row (or confirm its approval live and add it to REGISTRATION_APPROVED_CORPUS_KEYS) before this can ship.`,
    );
  }
}
