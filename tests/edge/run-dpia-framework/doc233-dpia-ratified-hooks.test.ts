// DOC 233 RATIFICATION (2026-09-09) — the five DPIA hooks whose own "CEO:
// ratify / revise / retire" line in doc 233 reads "CEO approved ...":
//   #3  Poste Italiane      (a3cf40b0)   — S2, rejected
//   #6  Comune di Bolzano   (dbfca969)   — S2, rejected (a SECOND, distinguished
//                                          paragraph was also approved; see below)
//   #7  WP248 criterion 3   (718bb432)   — S1, accepted
//   #12 MediaLab.AI / Imgur (0675e6a0)   — S2, rejected
//   #15 Volkswagen          (68252e3a)   — S2, rejected
// Every other doc 233 candidate's ratify line is blank and is NOT touched.
//
// Same mechanism as LIA's doc 223B ratification (doc238-lia-shape-
// amendments.test.ts is the template): the approved paragraphs are hand-
// written prose, not template fills, so each hook's live `authority_hooks`
// row carries the paragraph VERBATIM in `literal_sentence_override`, and
// `renderSentence` (dpia-hook-join.ts) prints it unchanged — bypassing
// shape/slot logic entirely. The paragraphs below are read from
// `tests/fixtures/doc233/ratified-<id>.txt`, written by a script that
// extracted them from doc 233's own markdown via regex and byte-verified
// them against the source lines (never retyped through chat — see
// project_large_text_writes_never_through_chat). The live DB values were
// verified byte-length/MD5-identical to these same files before this test
// was committed.
//
// The per-hook wiring (atoms, paraphrases, ids) is `tests/fixtures/doc233/
// hooks.json` — the SAME file the SQL generator read to write the live rows,
// so the test and the DB cannot drift on what was wired.
//
// The Bolzano DISTINGUISHED paragraph (`ratified-dbfca969-distinguished.txt`)
// is approved but NOT carried by any hook: `literal_sentence_override` is one
// string per hook, doc 233 names no record atom for "occasional or incidental
// observation", and the S2 text must never print on a distinguished record.
// It is pinned here as a fixture only — [NEEDS: a per-shape override + an
// authored distinguishing pair] before it can render.

import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityHook, HookSourceStatus } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import type { TypedStateBag } from "../../../supabase/functions/_shared/corpus/rule-types.ts";
import { tidyRenderedSentence } from "../../../supabase/functions/_shared/corpus/hook-render-tidy.ts";
import { citationFor, shortLabelFor, type HookProfileRow, type HookSourceRow } from "../../../supabase/functions/generate-corpus-hooks/_local/generate.ts";
import { clauseFormErrors } from "../../../supabase/functions/generate-corpus-hooks/_local/verify.ts";
import { checkAtoms } from "../../../supabase/functions/generate-corpus-hooks/_local/vocabulary.ts";
import { HOOK_PRODUCT_REGISTRY } from "../../../supabase/functions/generate-corpus-hooks/_local/product-registry.ts";
import { applyDpiaHooks, renderSentence } from "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-deliverables/dpia-hook-join.ts";
import {
  DPIA_APPEAL_SENTENCE,
  DPIA_ATOM_PHRASES,
  DPIA_FACTOR_ELEMENT,
  DPIA_SOURCE_STATUS_LABELS,
} from "../../../supabase/functions/run-dpia-framework/_local/corpus/maps/dpia-hooks.ts";

const FIXTURE_DIR = new URL("../../fixtures/doc233/", import.meta.url);

interface WiredHook {
  readonly short: string;
  readonly candidate: string;
  readonly profile_id: string;
  readonly source_table: "enforcement_actions" | "edpb_guidelines";
  readonly source_row_id: string;
  readonly profile_factor_id: string;
  readonly profile_posture: "accepted" | "rejected";
  readonly bears_on_element: "obligation" | "adequacy";
  readonly fact_atoms: readonly string[];
  readonly required_atoms: readonly string[];
  readonly finding_span: string;
  readonly fact_pattern_paraphrase: string;
  readonly finding_paraphrase: string;
  readonly settledness: "R1" | "R3";
  readonly citation_facts: Record<string, string | null>;
  readonly fixture: string;
  readonly second_approved_paragraph?: string;
}

const WIRING: readonly WiredHook[] = JSON.parse(await Deno.readTextFile(new URL("hooks.json", FIXTURE_DIR))).hooks;
assertEquals(WIRING.length, 5, "doc 233 has exactly five CEO-approved candidates");

async function fixture(rel: string): Promise<string> {
  // `rel` is repo-relative in hooks.json; the fixtures sit beside it.
  return (await Deno.readTextFile(new URL(rel.replace(/^tests\/fixtures\/doc233\//, ""), FIXTURE_DIR))).trim();
}

const RATIFIED = new Map<string, string>();
for (const w of WIRING) RATIFIED.set(w.short, await fixture(w.fixture));
const BOLZANO_DISTINGUISHED = await fixture("tests/fixtures/doc233/ratified-dbfca969-distinguished.txt");

/** The real generate-time citation/label composition for this wiring row. */
function citationParts(w: WiredHook) {
  const profile: HookProfileRow = {
    id: w.profile_id,
    source_table: w.source_table,
    source_row_id: w.source_row_id,
    outcome_posture: w.profile_posture,
    instrument: "EU GDPR",
    factor_ids: [w.profile_factor_id],
    ratified_by: null,
    ratified_at: null,
    ledger_ref: null,
  };
  const source: HookSourceRow = { source_table: w.source_table, ...w.citation_facts };
  const cite = citationFor(profile, source);
  assert(cite, `citationFor returned null for ${w.short}`);
  const short = shortLabelFor(profile, source);
  assert(short, `shortLabelFor returned null for ${w.short}`);
  return { cite: cite!, short: short! };
}

/** A realistic runtime hook for one wiring row — every field the live row
 *  carries, plus the generate-time derivations. `literal_sentence_override`
 *  is set by default (the ratified state); pass `null` to see the shape path. */
function hookFor(w: WiredHook, overrides: Partial<AuthorityHook> = {}): AuthorityHook {
  const { cite, short } = citationParts(w);
  const source_status: HookSourceStatus = w.source_table === "edpb_guidelines" ? "edpb_guidelines_final" : "sa_decision";
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
    bears_on_element: w.bears_on_element,
    authority_label: cite.authority_label,
    authority_label_short: short,
    regulator: cite.regulator,
    hook_version: 1,
    source_status,
    status_label: DPIA_SOURCE_STATUS_LABELS[source_status],
    pinpoint: null, // doc 233: [NEEDS: pinpoint] on every one of the five
    relevance: {
      instrument: "EU GDPR",
      factor_ids: [w.profile_factor_id],
      use_case_class: null,
      relationship: null,
      data_categories: [],
      flags: [],
      outcome_posture: w.profile_posture,
    },
    literal_sentence_override: RATIFIED.get(w.short)!,
    ...overrides,
  };
}

/** A record on which every one of the hook's `required_atoms` and
 *  `fact_atoms` holds (built from the atoms themselves, so a wiring change
 *  is reflected automatically). */
function statesHolding(w: WiredHook, verdict: string): TypedStateBag {
  const bag: TypedStateBag = {
    instrument: "EU GDPR",
    use_case_class: null,
    relationship: null,
    data_categories: [],
    flags: [],
    verdicts: { obligation: verdict, adequacy: "uncertain" },
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
      const eq = rest.lastIndexOf("=");
      bag.states[rest.slice(0, eq)] = rest.slice(eq + 1);
    } else throw new Error(`unexpected atom kind in wiring: ${atom}`);
  }
  return bag;
}

const EXPECTED_SHAPE: Record<string, "S1" | "S2"> = {
  a3cf40b0: "S2",
  dbfca969: "S2",
  "718bb432": "S1",
  "0675e6a0": "S2",
  "68252e3a": "S2",
};

// ── The wiring is mechanically valid ─────────────────────────────────────

Deno.test("doc233 DPIA — every fact/required atom on the five ratified hooks is in DPIA's CLOSED vocabulary (checkAtoms, HOOK_PRODUCT_REGISTRY.dpia) and has a DPIA_ATOM_PHRASES entry", () => {
  const registry = HOOK_PRODUCT_REGISTRY.dpia;
  assert(registry, "dpia registry entry");
  for (const w of WIRING) {
    const atoms = [...w.required_atoms, ...w.fact_atoms];
    assert(atoms.length > 0, `${w.short}: no atoms`);
    assertEquals(checkAtoms(atoms, registry), [], `${w.short}: atoms outside the closed vocabulary`);
    for (const atom of atoms) assert(DPIA_ATOM_PHRASES[atom] !== undefined, `${w.short}: no ratified phrase for ${atom}`);
    // doc 233 §10b / LIA pattern: required_atoms is a coarse gate (one atom).
    assertEquals(w.required_atoms.length, 1, `${w.short}: required_atoms must be a single coarse gate`);
    // The doc 223 hazard designed out: nothing in distinguishing_atoms (none authored).
  }
});

Deno.test("doc233 DPIA — every paraphrase on the five ratified hooks satisfies verify.ts's clause-form rules (< 60 words, no quote marks, no brackets/ellipsis, no trailing punctuation)", () => {
  for (const w of WIRING) {
    assertEquals(clauseFormErrors(`${w.short}.fact_pattern_paraphrase`, w.fact_pattern_paraphrase).errors, []);
    assertEquals(clauseFormErrors(`${w.short}.finding_paraphrase`, w.finding_paraphrase).errors, []);
    assert(w.finding_span.length > 0, `${w.short}: finding_span empty`);
  }
});

Deno.test("doc233 DPIA — the two ratified hooks whose PROFILE factor is a doc 233 PROPOSED factor (children's-data trigger, innovative-technology trigger) map to NO element yet: generate.ts will exclude them BY NAME until the CEO rules (doc 233 [NEEDS])", () => {
  const unmapped = WIRING.filter((w) => DPIA_FACTOR_ELEMENT[w.profile_factor_id] === undefined).map((w) => w.short).sort();
  assertEquals(unmapped, ["0675e6a0", "68252e3a"]);
  for (const w of WIRING) {
    if (unmapped.includes(w.short)) continue;
    assertEquals(DPIA_FACTOR_ELEMENT[w.profile_factor_id], w.bears_on_element, `${w.short}: element`);
  }
});

// ── literal_sentence_override — byte-for-byte ────────────────────────────

Deno.test("doc233 DPIA — each ratified hook's literal_sentence_override renders VERBATIM through renderSentence, bypassing shape/slot logic entirely (garbage shape/atoms/pair are never consulted)", () => {
  for (const w of WIRING) {
    const ratified = RATIFIED.get(w.short)!;
    assert(ratified.length > 500, `${w.short}: fixture suspiciously short`);
    const hook = hookFor(w);
    for (const shape of ["S1", "S2", "S3", "S4", "S5a", "S5b", "S6", "S6x"] as const) {
      assertEquals(renderSentence(hook, shape, [], undefined), ratified, `${w.short} via ${shape}`);
    }
    assert(ratified.endsWith(".)"), `${w.short}: an approved paragraph ends at its citation parenthetical`);
    assert(!ratified.includes("**") && !ratified.includes("\n"), `${w.short}: markdown/newline leaked into the fixture`);
  }
});

Deno.test("doc233 DPIA — the ratified paragraphs open with the record fact each card states, and close with doc 233's own citation parentheticals", () => {
  const r = (s: string) => RATIFIED.get(s)!;
  assert(r("a3cf40b0").startsWith("The record describes a fraud-prevention tool that collects customer data at scale."));
  assert(r("a3cf40b0").endsWith("(Garante, Poste Italiane S.p.A., decision of 17 April 2026; supervisory-authority decision — persuasive, non-binding outside its jurisdiction.)"));
  assert(r("dbfca969").startsWith("The record describes monitoring of employees' internet usage."));
  assert(r("dbfca969").endsWith("(Garante, Comune di Bolzano, decision of 13 May 2021; supervisory-authority decision — persuasive, non-binding outside its jurisdiction.)"));
  assert(r("718bb432").startsWith("The record describes ongoing, organized monitoring of a defined group of people"));
  assert(r("718bb432").endsWith("EDPB guidelines — interpretive guidance, not binding law, endorsed by the EDPB 25 May 2018.)"));
  assert(r("0675e6a0").startsWith("The record describes an online platform or service that children under 18 can access."));
  assert(r("0675e6a0").endsWith("(ICO, MediaLab.AI, Inc., decision of 4 February 2026; supervisory-authority decision — persuasive, non-binding outside its jurisdiction.)"));
  assert(r("68252e3a").startsWith("The record describes a new or experimental technology being tested or deployed"));
  assert(r("68252e3a").endsWith("(Data Protection Authority of Lower Saxony, Volkswagen, decision of 26 July 2022; supervisory-authority decision — persuasive, non-binding outside its jurisdiction.)"));
});

Deno.test("doc233 DPIA — literal_sentence_override still takes appealSuffix (a fact about the source discovered after ratification) but never a hedge/quote/shape slot on top", () => {
  for (const w of WIRING) {
    if (w.source_table !== "enforcement_actions") continue;
    const hook = hookFor(w, { source_status: "sa_decision_appeal_pending" });
    assertEquals(renderSentence(hook, "S2", [], undefined), `${RATIFIED.get(w.short)} ${DPIA_APPEAL_SENTENCE}`);
  }
});

Deno.test("doc233 DPIA — a hook WITHOUT literal_sentence_override (null/undefined/empty) falls through to the shape path and never reproduces a ratified paragraph", () => {
  for (const w of WIRING) {
    for (const override of [null, undefined, ""]) {
      const hook = hookFor(w, { literal_sentence_override: override });
      const rendered = renderSentence(hook, EXPECTED_SHAPE[w.short], hook.fact_atoms, undefined);
      assert(rendered, `${w.short}: shape path should still render`);
      assertNotEquals(rendered, RATIFIED.get(w.short));
      assert(rendered!.includes(`"${w.finding_span}"`), `${w.short}: the {quote} slot should fire on the shape path`);
    }
  }
});

Deno.test("doc233 DPIA — the render-time tidy pass is a byte-for-byte no-op on every ratified paragraph (including the uncarried Bolzano distinguished one)", () => {
  for (const text of [...RATIFIED.values(), BOLZANO_DISTINGUISHED]) assertEquals(tidyRenderedSentence(text), text);
});

// ── End to end through the real DPIA join ────────────────────────────────

Deno.test("doc233 DPIA — through applyDpiaHooks on a record where the hook's atoms hold and the obligation verdict fails: the ratified paragraph is the rendered sentence, on the matrix shape the posture dictates (S2 rejected / S1 accepted)", () => {
  for (const w of WIRING) {
    const hook = hookFor(w);
    const { applications, flags } = applyDpiaHooks([hook], statesHolding(w, "fails"), { obligation: "fails", adequacy: "uncertain" }, [w.source_row_id], new Set());
    assertEquals(flags, [], `${w.short}: unexpected flags`);
    assertEquals(applications.length, 1, `${w.short}: expected exactly one application`);
    assertEquals(applications[0].shape, EXPECTED_SHAPE[w.short]);
    assertEquals(applications[0].fact_agreement, "same");
    assertEquals(applications[0].sentence, RATIFIED.get(w.short));
  }
});

Deno.test("doc233 DPIA — the override never changes DIRECTION: a rejected hook on the same facts under a PASSING obligation verdict is still omitted with `rule_missing` (the lawyer's rule), the accepted WP248 hook still renders S1", () => {
  for (const w of WIRING) {
    const hook = hookFor(w);
    const { applications, flags } = applyDpiaHooks([hook], statesHolding(w, "passes"), { obligation: "passes", adequacy: "uncertain" }, [w.source_row_id], new Set());
    if (w.profile_posture === "rejected") {
      assertEquals(applications, []);
      assertEquals(flags, [{ hook_id: hook.hook_id, reason: "rule_missing" }]);
    } else {
      assertEquals(flags, []);
      assertEquals(applications.length, 1);
      assertEquals(applications[0].shape, "S1");
      assertEquals(applications[0].sentence, RATIFIED.get(w.short));
    }
  }
});

Deno.test("doc233 DPIA — a record on which the coarse required_atoms gate does NOT hold never nominates the hook (silently — no flag, no sentence)", () => {
  for (const w of WIRING) {
    const hook = hookFor(w);
    const bag = statesHolding(w, "fails");
    const empty: TypedStateBag = { ...bag, instrument: "UK GDPR", use_case_class: null, relationship: null, data_categories: [], flags: [], states: {} };
    const { applications, flags } = applyDpiaHooks([hook], empty, empty.verdicts, [w.source_row_id], new Set());
    assertEquals(applications, [], w.short);
    assertEquals(flags, [], w.short);
  }
});

// ── The uncarried second paragraph ────────────────────────────────────────

Deno.test("doc233 DPIA — Bolzano's APPROVED distinguished paragraph exists as a fixture, differs from the carried S2 paragraph, and is carried by NO hook (literal_sentence_override is one string per hook; no distinguishing atom is authored) — a documented [NEEDS], not a silent drop", () => {
  assert(BOLZANO_DISTINGUISHED.startsWith("The record describes occasional or incidental observation"));
  assert(BOLZANO_DISTINGUISHED.endsWith("(Garante, Comune di Bolzano, decision of 13 May 2021; supervisory-authority decision — persuasive, non-binding outside its jurisdiction.)"));
  assertNotEquals(BOLZANO_DISTINGUISHED, RATIFIED.get("dbfca969"));
  for (const w of WIRING) {
    assertNotEquals(RATIFIED.get(w.short), BOLZANO_DISTINGUISHED);
    assertEquals(hookFor(w).distinguishing_atoms, []);
    assertEquals(hookFor(w).distinguishing_pairs, undefined);
  }
  const bolzano = WIRING.find((w) => w.short === "dbfca969")!;
  assertEquals(bolzano.second_approved_paragraph, "tests/fixtures/doc233/ratified-dbfca969-distinguished.txt");
});
