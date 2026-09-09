// DOC 236 RATIFICATION (2026-09-09) — all ten ADMT candidates in doc 236 carry
// "CEO approved the prose (2026-09-09)" on their own ratify line:
//   G1  § 7150(b)(6) training risk           (f77eaad2, FSOR)   — Governance
//   G2  § 7155(a)(3) material change         (be2a91bc, FSOR)   — Governance
//   G3  § 7155(c) 31 Dec 2027 deadline       (c6d63d10, FSOR)   — Governance, conditional
//   E1  Garante, Friuli Occidentale          (a3463b6c, enforcement, foreign analogy)
//   Notice content § 7220(c)(1)              (7f616c44, FSOR)
//   Opt-out § 7221(c)(4) cookie banners      (4b2d39e1, FSOR)
//   Opt-out § 7221(b)(2)(A) appeal reviewer  (2951b3e7, FSOR)   — conditional
//   Access § 7222(b)(1)                      (84d00bed, FSOR)   — accepted
//   Vendor § 7222(i)                         (88f44d5e, FSOR)   — conditional
//   Significant decision § 7001(ddd)         (83bcecda, FSOR)
//
// WRITTEN 2026-09-09 (the prep-only state this file first pinned was
// unblocked once `authority_relevance_profiles` carried the 10 `product =
// 'admt'` rows): all ten are live `authority_hooks` rows, each carrying its
// approved paragraph VERBATIM in `literal_sentence_override`. FIVE are
// `hook_status = 'ratified'` (`ledger_ref = 'doc236'`); FIVE were deliberately
// left at `'settled'` (no ratified_by / ratified_at / ledger_ref) because a
// structural blocker, independent of the prose, makes "ratified" dishonest
// today — each blocker is restated per hook in hooks.json from the code that
// enforces it, and asserted mechanically below:
//   - G1 / G2 / G3: the live profile's factor is "Governance, Record
//     Sufficiency, and Related Risk-Assessment Obligations", which
//     `admtElementOf` maps to null (ADMT's element vocabulary is exactly the
//     eight admt-corpus-map.ts factor_ids) — generate.ts excludes such a hook
//     BY NAME, hook-join.ts has no `{section}` for it, and admt-v2-assemble.ts
//     Section 7 has no attachCorpusRows call (doc 236 §3 / §8.2).
//   - G3 / opt-out-pathway/08 / vendor-dependency/02: `conditional` posture
//     with no `recognised_proposition` / `condition_text` — doc 236 drafts
//     neither, and inventing them would be new structured legal content, not
//     extraction (doc 222 §2.1; generate.ts:773 excludes BY NAME; verify.ts
//     settleDecision would say `proposition_split_missing`). NOTE on the
//     mechanism: `directionFor` itself still resolves S5a for such a hook —
//     it is the S5a/S5b/S6/S6x proposition/condition SLOTS in renderSentence
//     that cannot resolve without the split, so on the shape path these hooks
//     cannot render at all; the override would print anyway, which is exactly
//     why they are NOT promoted until the split is authored.
//
// `tests/fixtures/doc236/hooks.json` is the single wiring spec BOTH the SQL
// generator that wrote the live rows AND this test read. The fixtures were
// extracted by a script from doc 236's own markdown (hard-wrapped `> `
// blockquotes joined with single spaces; the `**` bold markers on the quoted
// FSOR clauses stripped and counted — words and quotation marks untouched;
// flagged for the CEO), never retyped through chat.

import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { directionFor, type AuthorityHook } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import type { TypedStateBag } from "../../../supabase/functions/_shared/corpus/rule-types.ts";
import { tidyRenderedSentence } from "../../../supabase/functions/_shared/corpus/hook-render-tidy.ts";
import { citationFor, deriveSourceStatus, shortLabelFor, type HookProfileRow, type HookSourceRow } from "../../../supabase/functions/generate-corpus-hooks/_local/generate.ts";
import { clauseFormErrors, droppedQualifiers, settlednessFor } from "../../../supabase/functions/generate-corpus-hooks/_local/verify.ts";
import type { ProfileForHook } from "../../../supabase/functions/generate-corpus-hooks/_local/prompts.ts";
import { checkAtoms } from "../../../supabase/functions/generate-corpus-hooks/_local/vocabulary.ts";
import { HOOK_PRODUCT_REGISTRY } from "../../../supabase/functions/generate-corpus-hooks/_local/product-registry.ts";
import { admtElementOf } from "../../../supabase/functions/generate-corpus-hooks/_local/admt-factor-element.ts";
import { ADMT_SECTION_ID_FOR_ELEMENT, applyAdmtHooks, renderSentence } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/hook-join.ts";
import { ADMT_APPEAL_SENTENCE, ADMT_ATOM_PHRASES, ADMT_FACTOR_PHRASES } from "../../../supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-hooks.ts";

const FIXTURE_DIR = new URL("../../fixtures/doc236/", import.meta.url);
const GOVERNANCE = "Governance, Record Sufficiency, and Related Risk-Assessment Obligations";

interface WiredHook {
  readonly short: string;
  readonly candidate: string;
  readonly product: "admt";
  readonly profile_id: string;
  readonly live_hook_id: string;
  readonly source_table: "enforcement_actions" | "cppa_fsor_commentary";
  readonly source_row_id: string;
  readonly profile_factor_id: string;
  readonly profile_factor_ids: readonly string[];
  readonly profile_posture: "accepted" | "conditional" | "rejected";
  readonly profile_instrument: string;
  readonly bears_on_element: string | null;
  readonly fact_atoms: readonly string[];
  readonly required_atoms: readonly string[];
  readonly vocabulary_checks_passed: boolean;
  readonly vocabulary_check_errors: readonly string[];
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
assertEquals(WIRING.length, 10, "doc 236 has exactly ten CEO-approved candidates");

async function fixtureBytes(rel: string): Promise<Uint8Array> {
  return await Deno.readFile(new URL(rel.replace(/^tests\/fixtures\/doc236\//, ""), FIXTURE_DIR));
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

const byShort = (s: string): WiredHook => {
  const w = WIRING.find((x) => x.short === s);
  assert(w, `no wiring for ${s}`);
  return w!;
};
const str = (v: string | boolean | null | undefined): string | null => (typeof v === "string" ? v : null);

const RATIFIED_SET = ["4b2d39e1", "7f616c44", "83bcecda", "84d00bed", "a3463b6c"];
const SETTLED_ONLY_SET = ["2951b3e7", "88f44d5e", "be2a91bc", "c6d63d10", "f77eaad2"];
const GOVERNANCE_SET = ["be2a91bc", "c6d63d10", "f77eaad2"];
const CONDITIONAL_SET = ["2951b3e7", "88f44d5e", "c6d63d10"];
const NO_ATOM_SET = ["4b2d39e1", "84d00bed", "be2a91bc", "c6d63d10", "f77eaad2"];

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
    regulation_citation: str(f.regulation_citation),
    page_ref: str(f.page_ref),
    fsor_package: str(f.fsor_package),
  };
}

function generateParts(w: WiredHook) {
  const profile = profileRowFor(w);
  const source = sourceRowFor(w);
  const cite = citationFor(profile, source);
  assert(cite, `citationFor returned null for ${w.short}`);
  const short = shortLabelFor(profile, source);
  assert(short, `shortLabelFor returned null for ${w.short}`);
  const status = deriveSourceStatus(profile, source, { appeal_note: null, verified_as_of: null }, "admt");
  assert(!("exclude" in status), `deriveSourceStatus excluded ${w.short}`);
  return { cite: cite!, short: short!, status };
}

/** A realistic runtime hook for one wiring row. For the three Governance
 *  rows `bears_on_element` is null in the wiring (admtElementOf maps the
 *  factor to nothing) — generate.ts would never emit them; the synthetic hook
 *  carries the raw factor name so the join's own `{section}` failure can be
 *  demonstrated. `literal_sentence_override` is set by default. */
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
    bears_on_element: w.bears_on_element ?? w.profile_factor_id,
    authority_label: cite.authority_label,
    authority_label_short: short,
    regulator: cite.regulator,
    hook_version: 1,
    source_status: status.source_status,
    status_label: status.status_label,
    verb: status.verb,
    status_in_citation: status.status_in_citation,
    pinpoint: null, // doc 236: authorable for the FSOR rows but not authored; unlocatable for E1
    relevance: {
      instrument: w.profile_instrument,
      factor_ids: [...w.profile_factor_ids],
      use_case_class: null,
      relationship: null,
      data_categories: [],
      flags: [],
      outcome_posture: w.profile_posture,
    },
    hedge_variant: w.source_table === "enforcement_actions" ? "foreign_analogy" : "domestic_facts",
    literal_sentence_override: RATIFIED.get(w.short)!,
    ...overrides,
  };
}

function statesHolding(w: WiredHook, verdict: string): TypedStateBag {
  const bag: TypedStateBag = {
    instrument: "CPPA ADMT Regulations",
    use_case_class: null,
    relationship: null,
    data_categories: [],
    flags: [],
    verdicts: { [w.bears_on_element ?? w.profile_factor_id]: verdict },
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

const emptyBag = (verdicts: Record<string, string>): TypedStateBag => ({
  instrument: "CPPA ADMT Regulations", use_case_class: null, relationship: null, data_categories: [], flags: [], verdicts, states: {},
});

// ── The ratified / settled-only split, restated from the code that enforces it ──

Deno.test("doc236 ADMT — exactly five hooks are ratified (ledger doc236) and five were inserted as settled ONLY, each settled-only row naming its blocker; nothing was stamped on a blocked row", () => {
  assertEquals(WIRING.filter((w) => w.hook_status_written === "ratified").map((w) => w.short).sort(), RATIFIED_SET);
  assertEquals(WIRING.filter((w) => w.hook_status_written === "settled").map((w) => w.short).sort(), SETTLED_ONLY_SET);
  for (const w of WIRING) {
    assertEquals(w.product, "admt");
    assert(/^[0-9a-f-]{36}$/.test(w.profile_id) && /^[0-9a-f-]{36}$/.test(w.live_hook_id), `${w.short}: live ids`);
    if (w.hook_status_written === "ratified") {
      assertEquals(w.ratified_by, "John McDonnell (CEO)", w.short);
      assertEquals(w.ledger_ref, "doc236", w.short);
      assertEquals(w.ratification_blocker, null, w.short);
    } else {
      assertEquals(w.ratified_by, null, w.short);
      assertEquals(w.ledger_ref, null, w.short);
      assert(w.ratification_blocker && w.ratification_blocker.length > 40, `${w.short}: a settled-only row must name its blocker`);
    }
  }
});

Deno.test("doc236 ADMT — blocker 2 (Governance): G1/G2/G3's live profile factor is the Governance string, admtElementOf maps it to null (bears_on_element null in the wiring), no section id exists for it, and on the shape path the join cannot resolve {section} — while every other hook's element is the factor itself with a section", () => {
  assertEquals(admtElementOf(GOVERNANCE), null);
  assertEquals(ADMT_SECTION_ID_FOR_ELEMENT[GOVERNANCE], undefined);
  assertEquals(ADMT_FACTOR_PHRASES[GOVERNANCE], undefined);
  for (const w of WIRING) {
    if (GOVERNANCE_SET.includes(w.short)) {
      assertEquals(w.profile_factor_id, GOVERNANCE, w.short);
      assertEquals(w.bears_on_element, null, w.short);
      assert(w.ratification_blocker!.includes("no bears_on_element"), w.short);
      // Without the override, S2 (the only shape a rejected hook prints on same facts) has an unresolved {section}.
      assertEquals(renderSentence(hookFor(w, { literal_sentence_override: null }), "S2", hookFor(w).fact_atoms, undefined), undefined, `${w.short}: {section} must be unresolvable`);
    } else {
      assertEquals(w.profile_factor_id !== GOVERNANCE, true);
      assertEquals(admtElementOf(w.profile_factor_id), w.profile_factor_id, w.short);
      assertEquals(w.bears_on_element, w.profile_factor_id, w.short);
      assert(ADMT_SECTION_ID_FOR_ELEMENT[w.bears_on_element!] !== undefined, w.short);
    }
  }
});

Deno.test("doc236 ADMT — blocker 1 (conditional without the proposition split): G3 / opt-out-pathway/08 / vendor-dependency/02 are conditional on the LIVE profile; directionFor still resolves S5a for them, but the S5a proposition/condition slots cannot resolve without recognised_proposition/condition_text — so on the shape path they render nothing, and only the override would print", () => {
  for (const w of WIRING) {
    if (CONDITIONAL_SET.includes(w.short)) {
      assertEquals(w.profile_posture, "conditional", w.short);
      assert(w.ratification_blocker!.includes("recognised_proposition"), w.short);
      assertEquals(directionFor("conditional", "same", "fails", w.settledness), { shape: "S5a" });
      const bare = hookFor(w, { literal_sentence_override: null });
      assertEquals(bare.recognised_proposition, undefined);
      assertEquals(bare.condition_text, undefined);
      assertEquals(renderSentence(bare, "S5a", bare.fact_atoms, undefined), undefined, `${w.short}: S5a must not render without the split`);
      assertEquals(renderSentence(hookFor(w), "S5a", [], undefined), RATIFIED.get(w.short), `${w.short}: the override would print — which is why it is not promoted`);
    } else {
      assertNotEquals(w.profile_posture, "conditional", w.short);
    }
  }
  // vendor-dependency/02: doc 236's own card says "neutral" (not a HookPosture); the live profile was corrected to conditional.
  assertEquals(byShort("88f44d5e").profile_posture, "conditional");
  // access-process/05: doc 236's "supports" was seeded live as "accepted".
  assertEquals(byShort("84d00bed").profile_posture, "accepted");
});

// ── The wiring is mechanically what was written ─────────────────────────────

Deno.test("doc236 ADMT — each committed fixture's md5/byte length equals the hash the live literal_sentence_override column was verified against (pinned in hooks.json)", () => {
  for (const w of WIRING) {
    const actual = FIXTURE_HASH.get(w.short)!;
    assertEquals(actual.md5, w.fixture_md5, `${w.short}: fixture md5 drifted from the value the live row was verified against`);
    assertEquals(actual.bytes, w.fixture_bytes, `${w.short}: fixture byte length drifted`);
  }
});

Deno.test("doc236 ADMT — every atom is the prep JSON's own proposal (nothing invented; five hooks carry NONE), each has an ADMT_ATOM_PHRASES entry, and checkAtoms passes for every hook EXCEPT notice-content/01, whose state: atom is not in STATE_ATOM_ENUMS — written live as vocabulary_checks_passed=false with the exact error (doc 236 [NEEDS])", () => {
  const registry = HOOK_PRODUCT_REGISTRY.admt;
  assert(registry, "admt registry entry");
  assertEquals(WIRING.filter((w) => w.required_atoms.length === 0).map((w) => w.short).sort(), NO_ATOM_SET);
  for (const w of WIRING) {
    const atoms = [...w.required_atoms, ...w.fact_atoms];
    assertEquals(w.required_atoms, w.fact_atoms, `${w.short}: every proposed atom is both gate and fact`);
    assert(w.required_atoms.length <= 1, `${w.short}: at most a single coarse gate`);
    for (const atom of atoms) assert(ADMT_ATOM_PHRASES[atom] !== undefined, `${w.short}: no phrase for ${atom}`);
    const errors = checkAtoms(atoms, registry);
    if (w.short === "7f616c44") {
      assertEquals(w.vocabulary_checks_passed, false);
      assert(errors.length > 0 && errors.every((e) => e.includes("state path is not in the hook vocabulary")), JSON.stringify(errors));
      assertEquals(w.vocabulary_check_errors, errors);
    } else {
      assertEquals(errors, [], `${w.short}: atoms outside the closed vocabulary`);
      assertEquals(w.vocabulary_checks_passed, true, w.short);
      assertEquals(w.vocabulary_check_errors, []);
    }
  }
});

Deno.test("doc236 ADMT — every paraphrase satisfies verify.ts's clause-form rules and drops no qualifier present in its finding_span (access-process/05's span carries 'necessary')", () => {
  for (const w of WIRING) {
    assertEquals(clauseFormErrors(`${w.short}.fact_pattern_paraphrase`, w.fact_pattern_paraphrase).errors, []);
    assertEquals(clauseFormErrors(`${w.short}.finding_paraphrase`, w.finding_paraphrase).errors, []);
    assertEquals(droppedQualifiers(w.finding_span, w.finding_paraphrase), [], w.short);
    assert(w.finding_span.length > 0, `${w.short}: finding_span empty`);
  }
  assert(droppedQualifiers(byShort("84d00bed").finding_span, "a paraphrase that forgets the qualifier").includes("necessary"));
});

Deno.test("doc236 ADMT — settledness is what verify.ts settlednessFor derives today: R3 for the enforcement row, and R3 BY FALL-THROUGH for every cppa_fsor_commentary row (no FSOR branch exists — regulatory_guidance -> R1, edpb -> R1/R3, else R3): recorded as derived, flagged as a [NEEDS], not asserted", () => {
  for (const w of WIRING) {
    const profile: ProfileForHook = {
      id: w.profile_id, product: w.product, source_table: w.source_table, source_row_id: w.source_row_id,
      extracted_quote: w.finding_span, outcome_posture: w.profile_posture, factor_ids: [...w.profile_factor_ids],
      use_case_class: null, flags: null, instrument: w.profile_instrument, curation_note: null, pipeline_stage: "human",
    };
    assertEquals(settlednessFor(profile, null), w.settledness, w.short);
    assertEquals(w.settledness, "R3", w.short);
  }
  // The gap itself, pinned: the same profile with the one source table settlednessFor DOES name as adopted guidance derives R1.
  const fsor = byShort("f77eaad2");
  const asGuidance: ProfileForHook = {
    id: fsor.profile_id, product: "admt", source_table: "regulatory_guidance", source_row_id: fsor.source_row_id, extracted_quote: null,
    outcome_posture: fsor.profile_posture, factor_ids: [...fsor.profile_factor_ids], use_case_class: null, flags: null, instrument: fsor.profile_instrument, curation_note: null, pipeline_stage: "human",
  };
  assertEquals(settlednessFor(asGuidance, null), "R1");
});

Deno.test("doc236 ADMT — deriveSourceStatus for the admt product: every FSOR row is regulator_guidance / 'states' with status_in_citation FALSE (doc 236's approved FSOR citations carry no status clause); E1 is sa_decision with the CEO-approved ADMT foreign-analogy label; and citationFor composes exactly the label hooks.json recorded", () => {
  for (const w of WIRING) {
    const { status, cite } = generateParts(w);
    assertEquals(cite.authority_label, w.citation_composed_by_generate_ts, `${w.short}: citation composition drifted from what hooks.json recorded`);
    if (w.source_table === "cppa_fsor_commentary") {
      assertEquals(status.source_status, "regulator_guidance", w.short);
      assertEquals(status.verb, "states");
      assertEquals(status.status_in_citation, false);
      assert(cite.authority_label.startsWith("California Privacy Protection Agency, Final Statement of Reasons, CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations, 11 CCR §"), cite.authority_label);
    } else {
      assertEquals(w.short, "a3463b6c");
      assertEquals(status.source_status, "sa_decision");
      assertEquals(status.status_label, "foreign supervisory-authority decision, cited by analogy — decided under the GDPR, not the CCPA or its Article 10/11 regulations");
      assertEquals(status.status_in_citation, true);
    }
  }
});

Deno.test("doc236 ADMT — citationFor reproduces the approved parenthetical's authority label for eight of the ten; the two it cannot are notice-content/01 (the DB row carries page_ref 'p. 45', the approved citation prints no page) and significant-decision/02 (DB regulation_citation § 7001(ddd)(6), approved § 7001(ddd) — the card flags this itself); hooks.json records which is which", () => {
  const notReproducible: string[] = [];
  for (const w of WIRING) {
    const { cite } = generateParts(w);
    const actual = RATIFIED.get(w.short)!.includes(cite.authority_label);
    assertEquals(actual, w.approved_parenthetical_reproducible_by_citationFor, `${w.short}: hooks.json's reproducibility flag is wrong`);
    if (!actual) notReproducible.push(w.short);
  }
  assertEquals(notReproducible.sort(), ["7f616c44", "83bcecda"]);
});

// ── literal_sentence_override — byte-for-byte ────────────────────────────

Deno.test("doc236 ADMT — each of the ten approved paragraphs renders VERBATIM through renderSentence via literal_sentence_override, bypassing shape/slot logic entirely (every shape, garbage atoms/pair) — ratified and settled-only alike", () => {
  for (const w of WIRING) {
    const ratified = RATIFIED.get(w.short)!;
    assert(ratified.length > 800, `${w.short}: fixture suspiciously short`);
    const hook = hookFor(w);
    for (const shape of ["S1", "S2", "S3", "S4", "S5a", "S5b", "S6", "S6x"] as const) {
      assertEquals(renderSentence(hook, shape, [], undefined), ratified, `${w.short} via ${shape}`);
    }
    assert(ratified.endsWith(".)"), `${w.short}: must end at the citation parenthetical`);
    assert(!ratified.includes("*") && !ratified.includes("\n") && !ratified.includes("  "), `${w.short}: markup/newline/double-space leaked`);
  }
});

Deno.test("doc236 ADMT — the fixtures are the approved paragraphs: FSOR citations carry the CPPA form with no status clause, E1 carries the approved foreign-analogy status, and the bold-stripped quoted clauses keep their words and quotation marks", () => {
  for (const w of WIRING) {
    const text = RATIFIED.get(w.short)!;
    if (w.short === "a3463b6c") {
      assert(text.endsWith("foreign supervisory-authority decision, cited by analogy — decided under the GDPR, not the CCPA or its Article 10/11 regulations.)"));
    } else {
      assert(text.includes("(California Privacy Protection Agency, Final Statement of Reasons, CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations, 11 CCR §"), `${w.short}: FSOR citation form`);
      assert(!text.includes("; CPPA Final Statement of Reasons —"), `${w.short}: doc 236's approved FSOR citations carry no status clause`);
    }
  }
  const r = (s: string) => RATIFIED.get(s)!;
  assert(r("f77eaad2").includes("training uses of personal information \"pose significant risk to consumers' privacy,\" including"));
  assert(r("be2a91bc").includes("a change is material if it \"creates new negative impacts,\" \"increases the magnitude or likelihood of previously identified negative impacts,\" or \"diminishes the effectiveness of safeguards.\""));
  assert(r("88f44d5e").includes("changes the Agency itself describes as necessary for the regulations' internal consistency, not a narrowing"));
  assert(r("7f616c44").startsWith("The company has described the ADMT's purpose in its Pre-use Notice in general terms"));
  assert(r("4b2d39e1").endsWith("11 CCR § 7221(c)(4), Appendix p. 212.)"));
  assert(r("2951b3e7").includes(`"${byShort("2951b3e7").finding_span},"`), "the verified FSOR span is quoted inside the approved paragraph");
  assert(r("83bcecda").toLowerCase().includes(byShort("83bcecda").finding_span.toLowerCase()));
});

Deno.test("doc236 ADMT — literal_sentence_override still takes appealSuffix (a fact about the source discovered after ratification) but never a hedge/quote/shape/status slot on top", () => {
  const e1 = byShort("a3463b6c");
  const hook = hookFor(e1, { source_status: "sa_decision_appeal_pending" });
  assertEquals(renderSentence(hook, "S2", [], undefined), `${RATIFIED.get(e1.short)} ${ADMT_APPEAL_SENTENCE}`);
});

Deno.test("doc236 ADMT — a hook WITHOUT literal_sentence_override (null/undefined/empty) falls through to the shape path and never reproduces an approved paragraph (hooks with a mapped element and at least one phrased atom)", () => {
  for (const w of WIRING) {
    if (w.bears_on_element === null || w.fact_atoms.length === 0) continue;
    for (const override of [null, undefined, ""]) {
      const hook = hookFor(w, { literal_sentence_override: override });
      const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
      assert(rendered, `${w.short}: shape path should still render`);
      for (const x of WIRING) assertNotEquals(rendered, RATIFIED.get(x.short));
      assert(rendered!.includes(`"${w.finding_span}"`), `${w.short}: the {quote} slot should fire on the shape path: ${rendered}`);
    }
  }
});

Deno.test("doc236 ADMT — the render-time tidy pass is a byte-for-byte no-op on every approved paragraph", () => {
  for (const text of RATIFIED.values()) assertEquals(tidyRenderedSentence(text), text);
});

// ── End to end through the real ADMT join ────────────────────────────────

Deno.test("doc236 ADMT — through applyAdmtHooks on a record where the hook's atom holds and the element verdict fails: the ratified paragraph is the rendered sentence — S2 for the rejected hooks (E1, notice-content/01, significant-decision/02); S5a for the two conditional settled-only hooks (the override prints on the conditional shape too, which is why they stay unpromoted)", () => {
  for (const w of WIRING) {
    if (w.fact_atoms.length === 0 || w.bears_on_element === null) continue;
    const hook = hookFor(w);
    const { applications, flags } = applyAdmtHooks([hook], statesHolding(w, "fails"), { [w.bears_on_element]: "fails" }, [w.source_row_id], new Set());
    assertEquals(flags, [], `${w.short}: unexpected flags`);
    assertEquals(applications.length, 1, `${w.short}: expected exactly one application`);
    assertEquals(applications[0].shape, w.profile_posture === "conditional" ? "S5a" : "S2", w.short);
    assertEquals(applications[0].fact_agreement, "same");
    assertEquals(applications[0].sentence, RATIFIED.get(w.short));
    assertEquals(applications[0].profile_id, w.profile_id);
  }
});

Deno.test("doc236 ADMT — the override never changes DIRECTION: a rejected hook on the same facts under a PASSING verdict is omitted with `rule_missing`; a record on which the atom does NOT hold never nominates a gated hook", () => {
  for (const w of WIRING) {
    if (w.fact_atoms.length === 0 || w.bears_on_element === null) continue;
    const hook = hookFor(w);
    if (w.profile_posture === "rejected") {
      const pass = applyAdmtHooks([hook], statesHolding(w, "passes"), { [w.bears_on_element]: "passes" }, [w.source_row_id], new Set());
      assertEquals(pass.applications, [], w.short);
      assertEquals(pass.flags, [{ hook_id: hook.hook_id, reason: "rule_missing" }], w.short);
    }
    const none = applyAdmtHooks([hook], emptyBag({ [w.bears_on_element]: "fails" }), { [w.bears_on_element]: "fails" }, [w.source_row_id], new Set());
    assertEquals(none.applications, [], w.short);
    assertEquals(none.flags, [], w.short);
  }
});

Deno.test("doc236 ADMT — the five hooks with NO atom (the prep JSON proposed none rather than a wrong one) are nominated on EVERY record ([].every() is true) with agreement always `unknown`: they never print without a stored two-leg selection — `selection_pending` on a ranked record, never a sentence (a documented [NEEDS], not a silent drop)", () => {
  for (const s of NO_ATOM_SET) {
    const w = byShort(s);
    const hook = hookFor(w);
    const element = w.bears_on_element ?? w.profile_factor_id;
    const { applications, flags } = applyAdmtHooks([hook], emptyBag({ [element]: "fails" }), { [element]: "fails" }, [w.source_row_id], new Set());
    assertEquals(applications, [], s);
    assertEquals(flags, [{ hook_id: hook.hook_id, reason: "selection_pending" }], s);
    const unranked = applyAdmtHooks([hook], emptyBag({ [element]: "fails" }), { [element]: "fails" }, [], new Set());
    assertEquals(unranked.applications, [], s);
    assertEquals(unranked.flags, [{ hook_id: hook.hook_id, reason: "omitted" }], s);
  }
});
