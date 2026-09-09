// DOC 234 RATIFICATION (2026-09-09) — the four CPPA Risk hooks whose own "CEO:
// ratify / revise / retire" line in doc 234 reads "CEO approved the revised
// prose (2026-09-09)":
//   Candidate 1  AP (NL), International Card Services  (dc095815)  — S2, rejected
//   Candidate 2  Garante (IT), Poste Italiane           (a3cf40b0)  — S2, rejected
//   Candidate 3  AEPD (ES), Cartonajes Bañeres          (e58dfa97)  — S2, rejected
//   Candidate 4  Garante (IT), Comune di Bolzano        (dbfca969)  — S2, rejected
// Candidates 5–18 (every FSOR candidate) have a BLANK ratify line and are not
// touched.
//
// WRITTEN + RATIFIED 2026-09-09 (the prep-only state this file first pinned
// was unblocked once `authority_relevance_profiles` carried the 18
// `product = 'cppa-risk'` rows): all four are live `authority_hooks` rows,
// `hook_status = 'ratified'`, `ledger_ref = 'doc234'`, each carrying its
// approved paragraph VERBATIM in `literal_sentence_override`. Same mechanism
// as LIA's doc 223B and DPIA's doc 233 ratifications: the paragraphs are
// hand-written prose, not template fills, so `renderSentence` (hook-join.ts)
// prints the override unchanged and never consults shape/slot logic.
//
// `tests/fixtures/doc234/hooks.json` is the single wiring spec BOTH the SQL
// generator that wrote the live rows AND this test read — profile ids, atoms
// (the prep JSON's own proposals, nothing invented), the NOT NULL paraphrases,
// the mechanically derived settledness, the live citation facts, the fixture
// md5 the live column was verified against, and the live hook ids. The
// fixtures (`ratified-<id>.txt`) were extracted by a script from doc 234's own
// markdown (hard-wrapped blockquotes joined with single spaces; Candidate 1's
// two markdown-italic markers stripped, quotation marks kept — flagged for the
// CEO), never retyped through chat.

import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import type { AuthorityHook } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import type { TypedStateBag } from "../../../supabase/functions/_shared/corpus/rule-types.ts";
import { tidyRenderedSentence } from "../../../supabase/functions/_shared/corpus/hook-render-tidy.ts";
import { citationFor, deriveSourceStatus, shortLabelFor, type HookProfileRow, type HookSourceRow } from "../../../supabase/functions/generate-corpus-hooks/_local/generate.ts";
import { clauseFormErrors, droppedQualifiers, settlednessFor } from "../../../supabase/functions/generate-corpus-hooks/_local/verify.ts";
import type { ProfileForHook } from "../../../supabase/functions/generate-corpus-hooks/_local/prompts.ts";
import { checkAtoms } from "../../../supabase/functions/generate-corpus-hooks/_local/vocabulary.ts";
import { HOOK_PRODUCT_REGISTRY } from "../../../supabase/functions/generate-corpus-hooks/_local/product-registry.ts";
import { riskElementOf } from "../../../supabase/functions/generate-corpus-hooks/_local/risk-factor-element.ts";
import { applyRiskHooks, FACTOR_SECTION, renderSentence } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/hook-join.ts";
import { RISK_APPEAL_SENTENCE, RISK_ATOM_PHRASES } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/corpus/maps/risk-hooks.ts";

const FIXTURE_DIR = new URL("../../fixtures/doc234/", import.meta.url);

interface WiredHook {
  readonly short: string;
  readonly candidate: string;
  readonly product: "cppa-risk";
  readonly profile_id: string;
  readonly live_hook_id: string;
  readonly source_table: "enforcement_actions";
  readonly source_row_id: string;
  readonly profile_factor_id: string;
  readonly profile_factor_ids: readonly string[];
  readonly profile_posture: "accepted" | "conditional" | "rejected";
  readonly profile_instrument: string;
  readonly bears_on_element: string | null;
  readonly fact_atoms: readonly string[];
  readonly required_atoms: readonly string[];
  readonly vocabulary_checks_passed: boolean;
  readonly finding_span: string;
  readonly fact_pattern_paraphrase: string;
  readonly finding_paraphrase: string;
  readonly settledness: "R1" | "R2" | "R3" | "R4";
  readonly citation_facts: Record<string, string | boolean | null>;
  readonly citation_composed_by_generate_ts: string | null;
  readonly approved_parenthetical_reproducible_by_citationFor: boolean;
  readonly fixture: string;
  readonly fixture_md5: string;
  readonly fixture_bytes: number;
  readonly hook_status_written: "ratified" | "settled";
  readonly ratified_by: string | null;
  readonly ledger_ref: string | null;
  readonly ratification_blocker: string | null;
}

const WIRING: readonly WiredHook[] = JSON.parse(await Deno.readTextFile(new URL("hooks.json", FIXTURE_DIR))).hooks;
assertEquals(WIRING.length, 4, "doc 234 has exactly four CEO-approved candidates");

async function fixtureBytes(rel: string): Promise<Uint8Array> {
  return await Deno.readFile(new URL(rel.replace(/^tests\/fixtures\/doc234\//, ""), FIXTURE_DIR));
}
async function md5Hex(bytes: Uint8Array): Promise<string> {
  // `slice()` yields an exact-size copy whose `.buffer` is a plain ArrayBuffer
  // (the std crypto typings reject a Uint8Array over an ArrayBufferLike).
  const digest = await crypto.subtle.digest("MD5", bytes.slice().buffer as ArrayBuffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const RATIFIED = new Map<string, string>();
const FIXTURE_HASH = new Map<string, { md5: string; bytes: number }>();
for (const w of WIRING) {
  const bytes = await fixtureBytes(w.fixture);
  RATIFIED.set(w.short, new TextDecoder().decode(bytes).trim());
  FIXTURE_HASH.set(w.short, { md5: await md5Hex(bytes), bytes: bytes.length });
}

const str = (v: string | boolean | null | undefined): string | null => (typeof v === "string" ? v : null);

function profileRowFor(w: WiredHook): HookProfileRow {
  return {
    id: w.profile_id,
    source_table: w.source_table,
    source_row_id: w.source_row_id,
    outcome_posture: w.profile_posture,
    instrument: w.profile_instrument,
    factor_ids: [...w.profile_factor_ids],
    ratified_by: null,
    ratified_at: null,
    ledger_ref: null,
  };
}

function sourceRowFor(w: WiredHook): HookSourceRow {
  const f = w.citation_facts;
  return {
    source_table: w.source_table,
    regulator: str(f.regulator),
    subject: str(f.subject),
    decision_date: str(f.decision_date),
    appeal_status: str(f.appeal_status),
    regulator_canonical: str(f.regulator_canonical),
    regulator_canonical_in_citation: f.regulator_canonical_in_citation === true,
  };
}

/** The real generate-time citation/label/status composition for this wiring row. */
function generateParts(w: WiredHook) {
  const profile = profileRowFor(w);
  const source = sourceRowFor(w);
  const cite = citationFor(profile, source);
  assert(cite, `citationFor returned null for ${w.short}`);
  const short = shortLabelFor(profile, source);
  assert(short, `shortLabelFor returned null for ${w.short}`);
  const status = deriveSourceStatus(profile, source, { appeal_note: null, verified_as_of: null }, "cppa-risk");
  assert(!("exclude" in status), `deriveSourceStatus excluded ${w.short}`);
  return { cite: cite!, short: short!, status };
}

/** A realistic runtime hook for one wiring row — every field the live row
 *  carries, plus the generate-time derivations. `literal_sentence_override`
 *  is set by default (the ratified state); pass `null` to see the shape path. */
function hookFor(w: WiredHook, overrides: Partial<AuthorityHook> = {}): AuthorityHook {
  const { cite, short, status } = generateParts(w);
  return {
    hook_id: `${w.source_table}:${w.source_row_id}:v1`,
    profile_id: w.profile_id,
    source_row_id: w.source_row_id,
    fact_atoms: [...w.fact_atoms],
    distinguishing_atoms: [],
    not_distinguishable: false,
    required_atoms: [...w.required_atoms],
    finding_span: w.finding_span,
    fact_pattern_paraphrase: w.fact_pattern_paraphrase,
    finding_paraphrase: w.finding_paraphrase,
    settledness: w.settledness,
    posture: w.profile_posture,
    factor_id: w.profile_factor_id,
    bears_on_element: w.bears_on_element ?? "",
    authority_label: cite.authority_label,
    authority_label_short: short,
    regulator: cite.regulator,
    hook_version: 1,
    source_status: status.source_status,
    status_label: status.status_label,
    verb: status.verb,
    status_in_citation: status.status_in_citation,
    pinpoint: null, // doc 234: pinpoint unlocatable on every one of the four (narrative rows)
    relevance: {
      instrument: w.profile_instrument,
      factor_ids: [...w.profile_factor_ids],
      use_case_class: null,
      relationship: null,
      data_categories: [],
      flags: [],
      outcome_posture: w.profile_posture,
    },
    hedge_variant: "foreign_analogy",
    literal_sentence_override: RATIFIED.get(w.short)!,
    ...overrides,
  };
}

/** A record on which every one of the hook's `required_atoms` and
 *  `fact_atoms` holds (built from the atoms themselves). */
function statesHolding(w: WiredHook, verdict: string): TypedStateBag {
  const bag: TypedStateBag = {
    instrument: "CPPA Regulations",
    use_case_class: null,
    relationship: null,
    data_categories: [],
    flags: [],
    verdicts: { [w.bears_on_element ?? ""]: verdict },
    states: {},
  };
  for (const atom of [...w.required_atoms, ...w.fact_atoms]) {
    const [kind, rest] = [atom.slice(0, atom.indexOf(":")), atom.slice(atom.indexOf(":") + 1)];
    if (kind === "flag") bag.flags.push(rest);
    else if (kind === "class") bag.use_case_class = rest;
    else if (kind === "relationship") bag.relationship = rest;
    else if (kind === "data_category") bag.data_categories.push(rest);
    else if (kind === "instrument") bag.instrument = rest;
    else if (kind === "state") {
      const eq = rest.indexOf("=");
      bag.states[rest.slice(0, eq)] = rest.slice(eq + 1);
    } else throw new Error(`unexpected atom kind in wiring: ${atom}`);
  }
  return bag;
}

const SHORTS = WIRING.map((w) => w.short).sort();

// ── The wiring is exactly what was written ─────────────────────────────────

Deno.test("doc234 Risk — all four hooks were written AND ratified (no structural blocker: every candidate is rejected-posture on a mapped factor), each linked to its live cppa-risk profile and hook row", () => {
  assertEquals(SHORTS, ["a3cf40b0", "dbfca969", "dc095815", "e58dfa97"]);
  for (const w of WIRING) {
    assertEquals(w.product, "cppa-risk");
    assertEquals(w.hook_status_written, "ratified", w.short);
    assertEquals(w.ratified_by, "John McDonnell (CEO)", w.short);
    assertEquals(w.ledger_ref, "doc234", w.short);
    assertEquals(w.ratification_blocker, null, w.short);
    assertEquals(w.profile_posture, "rejected", w.short);
    assert(/^[0-9a-f-]{36}$/.test(w.profile_id) && /^[0-9a-f-]{36}$/.test(w.live_hook_id), `${w.short}: live ids`);
  }
});

Deno.test("doc234 Risk — each committed fixture's md5/byte length equals the hash the live literal_sentence_override column was verified against (pinned in hooks.json)", () => {
  for (const w of WIRING) {
    const actual = FIXTURE_HASH.get(w.short)!;
    assertEquals(actual.md5, w.fixture_md5, `${w.short}: fixture md5 drifted from the value the live row was verified against`);
    assertEquals(actual.bytes, w.fixture_bytes, `${w.short}: fixture byte length drifted`);
  }
});

Deno.test("doc234 Risk — every atom is the prep JSON's own proposal, in Risk's CLOSED vocabulary (checkAtoms, HOOK_PRODUCT_REGISTRY['cppa-risk']) with a RISK_ATOM_PHRASES entry; required_atoms is a single coarse gate", () => {
  const registry = HOOK_PRODUCT_REGISTRY["cppa-risk"];
  assert(registry, "cppa-risk registry entry");
  for (const w of WIRING) {
    const atoms = [...w.required_atoms, ...w.fact_atoms];
    assert(atoms.length > 0, `${w.short}: no atoms`);
    assertEquals(checkAtoms(atoms, registry), [], `${w.short}: atoms outside the closed vocabulary`);
    assertEquals(w.vocabulary_checks_passed, true, w.short);
    for (const atom of atoms) assert(RISK_ATOM_PHRASES[atom] !== undefined, `${w.short}: no phrase for ${atom}`);
    assertEquals(w.required_atoms.length, 1, `${w.short}: required_atoms must be a single coarse gate`);
  }
});

Deno.test("doc234 Risk — every paraphrase satisfies verify.ts's clause-form rules and drops no qualifier present in its finding_span", () => {
  for (const w of WIRING) {
    assertEquals(clauseFormErrors(`${w.short}.fact_pattern_paraphrase`, w.fact_pattern_paraphrase).errors, []);
    assertEquals(clauseFormErrors(`${w.short}.finding_paraphrase`, w.finding_paraphrase).errors, []);
    assertEquals(droppedQualifiers(w.finding_span, w.finding_paraphrase), [], w.short);
    assert(w.finding_span.length > 0, `${w.short}: finding_span empty`);
  }
});

Deno.test("doc234 Risk — bears_on_element is the profile's first factor_id verbatim (riskElementOf identity map) and FACTOR_SECTION resolves it to a § 7150–7157 pinpoint", () => {
  for (const w of WIRING) {
    assertEquals(riskElementOf(w.profile_factor_id), w.bears_on_element, w.short);
    assert(w.bears_on_element && FACTOR_SECTION[w.bears_on_element] !== undefined, `${w.short}: no section for ${w.bears_on_element}`);
  }
});

Deno.test("doc234 Risk — settledness is what verify.ts settlednessFor derives for an enforcement_actions source (R3), never asserted", () => {
  for (const w of WIRING) {
    const profile: ProfileForHook = {
      id: w.profile_id, product: w.product, source_table: w.source_table, source_row_id: w.source_row_id,
      extracted_quote: w.finding_span, outcome_posture: w.profile_posture, factor_ids: [...w.profile_factor_ids],
      use_case_class: null, flags: null, instrument: w.profile_instrument, curation_note: null, pipeline_stage: "human",
    };
    assertEquals(settlednessFor(profile, null), w.settledness, w.short);
    assertEquals(w.settledness, "R3");
  }
});

Deno.test("doc234 Risk — deriveSourceStatus for the cppa-risk product derives sa_decision with the CEO-approved Risk label for every one of the four (all foreign GDPR decisions); Candidate 1's appeal_status='final' stays sa_decision and citationFor appends ', final on appeal'", () => {
  for (const w of WIRING) {
    const { status, cite } = generateParts(w);
    assertEquals(status.source_status, "sa_decision", w.short);
    assertEquals(status.verb, "found");
    assertEquals(status.status_in_citation, true);
    assertEquals(status.status_label, "foreign supervisory-authority decision, cited by analogy — not binding on California regulators");
    assertEquals(cite.authority_label, w.citation_composed_by_generate_ts, `${w.short}: citation composition drifted from what hooks.json recorded`);
  }
  const ics = WIRING.find((w) => w.short === "dc095815")!;
  assert(generateParts(ics).cite.authority_label.endsWith(", final on appeal"));
});

Deno.test("doc234 Risk — citationFor reproduces the approved parenthetical's authority label for Candidate 1 only (regulator_canonical opted in + the English gloss); Candidates 2–4 print a form citationFor cannot compose (native name without gloss / a PS docket not on the row) — the override carries them, and hooks.json records which is which", () => {
  const reproducible: string[] = [];
  for (const w of WIRING) {
    const { cite } = generateParts(w);
    const actual = RATIFIED.get(w.short)!.includes(cite.authority_label);
    assertEquals(actual, w.approved_parenthetical_reproducible_by_citationFor, `${w.short}: hooks.json's reproducibility flag is wrong`);
    if (actual) reproducible.push(w.short);
  }
  assertEquals(reproducible, ["dc095815"]);
});

// ── literal_sentence_override — byte-for-byte ────────────────────────────

Deno.test("doc234 Risk — each ratified paragraph renders VERBATIM through renderSentence via literal_sentence_override, bypassing shape/slot logic entirely (every shape, garbage atoms/pair)", () => {
  for (const w of WIRING) {
    const ratified = RATIFIED.get(w.short)!;
    assert(ratified.length > 1000, `${w.short}: fixture suspiciously short`);
    const hook = hookFor(w);
    for (const shape of ["S1", "S2", "S3", "S4", "S5a", "S5b", "S6", "S6x"] as const) {
      assertEquals(renderSentence(hook, shape, [], undefined), ratified, `${w.short} via ${shape}`);
    }
    assert(ratified.endsWith(".)"), `${w.short}: an approved paragraph ends at its citation parenthetical`);
    assert(!ratified.includes("*") && !ratified.includes("\n") && !ratified.includes("  "), `${w.short}: markup/newline/double-space leaked into the fixture`);
  }
});

Deno.test("doc234 Risk — the four fixtures are the approved paragraphs: CA-rule-first opening and doc 234's own citation parentheticals", () => {
  const r = (s: string) => RATIFIED.get(s)!;
  for (const w of WIRING) assert(r(w.short).startsWith("The company has said"), `${w.short}: opening`);
  assert(r("dc095815").endsWith("(Autoriteit Persoonsgegevens (Dutch Data Protection Authority), International Card Services B.V., decision of 15 January 2024, final on appeal; foreign supervisory-authority decision, cited by analogy — not binding on California regulators.)"));
  // The Dutch quotation survives the italic-marker strip with its quotation marks intact.
  assert(r("dc095815").includes("In its own words: \"ICS heeft nagelaten om een DPIA uit te voeren voordat het bedrijf in 2019 begon met het digitaal identificeren van klanten in Nederland\" — \"ICS failed to carry out a DPIA"));
  assert(r("a3cf40b0").endsWith("not independently re-translated from the Italian decision this session.)"));
  assert(r("e58dfa97").endsWith("(Agencia Española de Protección de Datos (Spanish Data Protection Agency), Cartonajes Bañeres, S.A., decision PS-00361-2023, 5 January 2024; foreign supervisory-authority decision, cited by analogy.)"));
  assert(r("dbfca969").endsWith("(Garante per la protezione dei dati personali, Comune di Bolzano, decision of 13 May 2021; foreign supervisory-authority decision, cited by analogy.)"));
  // The finding_span each row was verified on is the source's own words — the Dutch one is quoted inside the approved paragraph itself.
  assert(r("dc095815").includes(WIRING.find((w) => w.short === "dc095815")!.finding_span));
});

Deno.test("doc234 Risk — literal_sentence_override still takes appealSuffix (a fact about the source discovered after ratification) but never a hedge/quote/shape slot on top", () => {
  for (const w of WIRING) {
    const hook = hookFor(w, { source_status: "sa_decision_appeal_pending" });
    assertEquals(renderSentence(hook, "S2", [], undefined), `${RATIFIED.get(w.short)} ${RISK_APPEAL_SENTENCE}`);
  }
});

Deno.test("doc234 Risk — a hook WITHOUT literal_sentence_override (null/undefined/empty) falls through to the shape path and never reproduces a ratified paragraph", () => {
  for (const w of WIRING) {
    for (const override of [null, undefined, ""]) {
      const hook = hookFor(w, { literal_sentence_override: override });
      const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
      assert(rendered, `${w.short}: shape path should still render`);
      assertNotEquals(rendered, RATIFIED.get(w.short));
      assert(rendered!.includes(`"${w.finding_span}"`), `${w.short}: the {quote} slot should fire on the shape path`);
    }
  }
});

Deno.test("doc234 Risk — the render-time tidy pass is a byte-for-byte no-op on every ratified paragraph", () => {
  for (const text of RATIFIED.values()) assertEquals(tidyRenderedSentence(text), text);
});

// ── End to end through the real Risk join ────────────────────────────────

Deno.test("doc234 Risk — through applyRiskHooks on a record where the hook's atoms hold and the factor verdict fails: the ratified paragraph is the rendered sentence on S2 (rejected posture, same facts)", () => {
  for (const w of WIRING) {
    const hook = hookFor(w);
    const { applications, flags } = applyRiskHooks([hook], statesHolding(w, "fails"), { [w.bears_on_element!]: "fails" }, [w.source_row_id], new Set());
    assertEquals(flags, [], `${w.short}: unexpected flags`);
    assertEquals(applications.length, 1, `${w.short}: expected exactly one application`);
    assertEquals(applications[0].shape, "S2");
    assertEquals(applications[0].fact_agreement, "same");
    assertEquals(applications[0].sentence, RATIFIED.get(w.short));
    assertEquals(applications[0].profile_id, w.profile_id);
  }
});

Deno.test("doc234 Risk — the override never changes DIRECTION: on the same facts under a PASSING verdict every one of these rejected hooks is omitted with `rule_missing` (the lawyer's rule); under a MISSING verdict (this product's pipeline today — doc 231A §5) S2 is refused with `verdict_missing`", () => {
  for (const w of WIRING) {
    const hook = hookFor(w);
    const pass = applyRiskHooks([hook], statesHolding(w, "passes"), { [w.bears_on_element!]: "passes" }, [w.source_row_id], new Set());
    assertEquals(pass.applications, [], w.short);
    assertEquals(pass.flags, [{ hook_id: hook.hook_id, reason: "rule_missing" }], w.short);
    const missing = applyRiskHooks([hook], statesHolding(w, "fails"), {}, [w.source_row_id], new Set());
    assertEquals(missing.applications, [], w.short);
    assertEquals(missing.flags, [{ hook_id: hook.hook_id, reason: "verdict_missing" }], w.short);
  }
});

Deno.test("doc234 Risk — a record on which the coarse required_atoms gate does NOT hold never nominates the hook (silently — no flag, no sentence)", () => {
  for (const w of WIRING) {
    const hook = hookFor(w);
    const empty: TypedStateBag = { instrument: "CPPA Regulations", use_case_class: null, relationship: null, data_categories: [], flags: [], verdicts: { [w.bears_on_element!]: "fails" }, states: {} };
    const { applications, flags } = applyRiskHooks([hook], empty, empty.verdicts, [w.source_row_id], new Set());
    assertEquals(applications, [], w.short);
    assertEquals(flags, [], w.short);
  }
});
