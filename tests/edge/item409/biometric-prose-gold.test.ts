// ITEM 409 — BIOMETRIC FLEET-TEMPLATE PACKAGE, LEG A.
//
// Batteries:
//   1. plan fidelity      — the spine encode against the approved plan JSON
//   2. supersession       — the item348 row is demoted and named
//   3. reference passages — byte-match against the cited corpus rows, plus a
//                           drift-detection proof in both directions
//   4. register           — banned register, enum leaks, fact exemption
//   5. the opener fix     — both directions
//   6. seam + R11         — over a fully assembled biometric document, with
//                           the passages asserted byte-identical through it
//   7. the stamp survives the LEAK-PREV-P2 serializer

import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  BIOMETRIC_BANNED_REGISTER,
  BIOMETRIC_FACT_EXEMPT_RULE,
  BIOMETRIC_IDIOM,
  BIOMETRIC_PIPELINE_STAMP,
  BIOMETRIC_PLAN_PRODUCT,
  BIOMETRIC_PLAN_ROW_ID,
  BIOMETRIC_PLAN_ROW_VERSION,
  BIOMETRIC_PLAN_SUPERSEDED_ROW_ID,
  BIOMETRIC_REFERENCE_RENDER_IDS,
  BIOMETRIC_SECTION_SPECS,
  BIOMETRIC_THESIS,
  REFERENCE_RENDER_TOKENS,
} from "../../../supabase/functions/check-biometric-compliance/_local/prose/plans/biometric.spine.ts";

import {
  applyBiometricCustomerRegister,
  applyBiometricHollowOmission,
  applyBiometricProseGold,
  BIOMETRIC_ENUM_OPTIONS,
  BIOMETRIC_PROSE_GOLD_VERSION,
  describeProcessingAsProse,
  isProtectedBiometricKey,
  passageSpans,
  repairApparatusOpener,
  repairBiometricProse,
  repairRequirementsHeading,
} from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-prose-gold.ts";

import {
  assertNoDrift,
  checkPassageShape,
  checkPassagesAgainstCorpus,
  checkPassagesSurviveAssembly,
  toReferencePassages,
} from "../../../supabase/functions/_shared/prose/biometric-reference-passages.ts";

import { BIOMETRIC_DUTY_ROWS } from "../../../supabase/functions/check-biometric-compliance/_local/registry/biometric-verified-authorities.ts";
import { lintAssembledProse } from "../../../supabase/functions/_shared/prose/assembled-prose-lint.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";
import { BIOMETRIC_REPORT_SCHEMA } from "../../../supabase/functions/check-biometric-compliance/_local/report-schemas/biometric.ts";

const planJson = JSON.parse(
  await Deno.readTextFile(new URL("../../../library/prose/plans/biometric.plan.json", import.meta.url)),
);

const CORPUS: Record<string, string> = JSON.parse(
  await Deno.readTextFile(new URL("./__fixtures__/biometric-corpus-rows.json", import.meta.url)),
);

const PASSAGES = toReferencePassages(BIOMETRIC_DUTY_ROWS);

// ── 1. PLAN FIDELITY ────────────────────────────────────────────────────────

Deno.test("item409 · plan row identity is pinned", () => {
  assertEquals(planJson.product, BIOMETRIC_PLAN_PRODUCT);
  assert(/^[0-9a-f-]{36}$/.test(BIOMETRIC_PLAN_ROW_ID));
  assertEquals(BIOMETRIC_PLAN_ROW_VERSION, 2);
  assertEquals(planJson.seed_default_approved, false);
  assert(String(planJson.approval_authority).includes("review panel"));
});

Deno.test("item409 · the spine encodes the approved plan's arc, verbatim", () => {
  const planIds = planJson.sections.map((s: { id: string }) => s.id);
  assertEquals(BIOMETRIC_SECTION_SPECS.map((s) => s.id), planIds);
  for (const spec of BIOMETRIC_SECTION_SPECS) {
    const row = planJson.sections.find((s: { id: string }) => s.id === spec.id);
    assertEquals(spec.title, row.title);
    assertEquals(spec.arc_stage, row.arc_stage);
    assertEquals(spec.lead, row.lead);
    assertEquals(spec.source_key, row.source_key);
    assertEquals([...spec.themes], row.themes);
    assertEquals(spec.required, row.required);
  }
});

Deno.test("item409 · thesis, idiom, banned register and render ids match the plan", () => {
  assertEquals(BIOMETRIC_THESIS, planJson.thesis);
  assertEquals(BIOMETRIC_IDIOM, planJson.idiom);
  assertEquals([...BIOMETRIC_BANNED_REGISTER], planJson.banned_register);
  assertEquals([...REFERENCE_RENDER_TOKENS], planJson.reference_render_tokens);
  assertEquals([...BIOMETRIC_REFERENCE_RENDER_IDS], planJson.provenance.render_doc_ids);
  assertEquals(BIOMETRIC_FACT_EXEMPT_RULE, planJson.provenance.fact_exempt_rule);
});

Deno.test("item409 · the arc runs determination → record → duty → remedy → close, never backwards", () => {
  const ARC_ORDER = ["headline", "record", "duty", "remedy", "close"];
  const stages = BIOMETRIC_SECTION_SPECS.map((s) => s.arc_stage);
  assertEquals(stages[0], "headline");
  assertEquals(stages[1], "record");
  assertEquals(stages[2], "duty");
  assertEquals(stages[stages.length - 1], "close");
  // The four requirement/analysis surfaces are all duty-stage: the register
  // lint forbids an arc that regresses, and analysis precedes duty in ARC_ORDER.
  assertEquals(stages.filter((s) => s === "duty").length, 4);
  let last = -1;
  for (const st of stages) {
    const i = ARC_ORDER.indexOf(st);
    assert(i >= last, `arc regresses at ${st}`);
    last = i;
  }
  // Every outcome section leads with its determination (conclusion-first law).
  for (const spec of BIOMETRIC_SECTION_SPECS) {
    if (spec.arc_stage !== "record") assertEquals(spec.lead, "determination", spec.id);
  }
});

// ── 2. SUPERSESSION ─────────────────────────────────────────────────────────

Deno.test("item409 · the plan names the row it supersedes and says what became of it", () => {
  assertEquals(planJson.supersedes.row_id, BIOMETRIC_PLAN_SUPERSEDED_ROW_ID);
  assertEquals(planJson.supersedes.version, 1);
  assert(String(planJson.supersedes.provenance).includes("item348"));
  assert(/RETAINED AND DEMOTED, NOT DELETED/.test(planJson.supersedes.disposition));
  assert(String(planJson.provenance.supersession_note).includes(BIOMETRIC_PLAN_SUPERSEDED_ROW_ID));
  assertEquals(
    planJson.provenance.approval_note,
    "panel-delegated approval per CEO delegation 2026-08-06",
  );
});

Deno.test("item409 · the superseded row is not the pinned row", () => {
  assert(String(BIOMETRIC_PLAN_SUPERSEDED_ROW_ID) !== String(BIOMETRIC_PLAN_ROW_ID));
});

// ── 3. REFERENCE-PASSAGE DISCIPLINE ─────────────────────────────────────────

Deno.test("item409 · every reference passage is shape-clean at boot", () => {
  assertEquals(checkPassageShape(PASSAGES), []);
});

Deno.test("item409 · every reference passage byte-matches the corpus row it cites", () => {
  const drift = checkPassagesAgainstCorpus(PASSAGES, CORPUS);
  assertEquals(drift.map((d) => `${d.id}:${d.reason}`), []);
  assertEquals(PASSAGES.length, 47);
});

Deno.test("item409 · the ITEM 388 failure is detected, not absorbed", () => {
  // A passage that actually carries straight quotes — the exact shape that
  // drifted in item388 when a registry entry was re-typed with curly quotes.
  const p = PASSAGES.find((x) => /['"]/.test(x.bytes))!;
  assert(p, "no passage carries a straight quote to mutate");
  const curly = { ...p, bytes: p.bytes.replace(/'/g, "\u2019").replace(/"/g, "\u201C") };
  const drift = checkPassagesAgainstCorpus([curly], CORPUS);
  assert(drift.length === 1, "quote drift must be reported");

  assert(
    drift[0].reason === "smart_quote_drift" || drift[0].reason === "not_substring_of_cited_row",
    `unexpected reason ${drift[0].reason}`,
  );
});

Deno.test("item409 · a passage citing a row it does not come from fails", () => {
  const bipa = PASSAGES.find((p) => p.corpus_key.startsWith("il-bipa"))!;
  const mis = { ...bipa, corpus_key: "tx-cubi-503-001-a" };
  const drift = checkPassagesAgainstCorpus([mis], CORPUS);
  assertEquals(drift.length, 1);
  assertEquals(drift[0].reason, "not_substring_of_cited_row");
});

Deno.test("item409 · a citation naming no corpus row at all fails", () => {
  const drift = checkPassagesAgainstCorpus(
    [{ ...PASSAGES[0], corpus_key: "il-bipa-740-14-99" }],
    CORPUS,
  );
  assertEquals(drift[0].reason, "missing_corpus_row");
});

Deno.test("item409 · assertNoDrift is the STOP condition", () => {
  assertThrows(
    () => assertNoDrift(checkPassagesAgainstCorpus([{ ...PASSAGES[0], corpus_key: "nope" }], CORPUS), "test"),
    Error,
    "REFERENCE-PASSAGE DRIFT",
  );
  assertNoDrift([], "clean");
});

// ── 4. REGISTER ─────────────────────────────────────────────────────────────

Deno.test("item409 · no builder literal carries a walked-render fact", async () => {
  const files = [
    "../../../supabase/functions/_shared/ltp/biometric-prose-gold.ts",
    "../../../supabase/functions/_shared/prose/biometric-reference-passages.ts",
  ];
  for (const f of files) {
    const src = await Deno.readTextFile(new URL(f, import.meta.url));
    for (const token of REFERENCE_RENDER_TOKENS) {
      assert(!src.includes(token), `${f} carries reference-render token ${token}`);
    }
  }
});

Deno.test("item409 · internal vocabulary is rendered customer-facing", () => {
  const before = "The duty is record_insufficient and the release cannot be determined.";
  const after = applyBiometricCustomerRegister(before);
  assert(!after.includes("record_insufficient"));
  assert(!after.includes("cannot be determined"));
  assert(after.includes("the record does not settle this"));
});

Deno.test("item409 · machine-keyed fields are named and left", () => {
  for (const k of ["citation", "pinpoint", "corpus_key", "build_stamp", "registry_version", "decision", "rule_ids", "generated_at"]) {
    assert(isProtectedBiometricKey(k), `${k} must be protected`);
  }
  assert(!isProtectedBiometricKey("assessment_text"));
});

Deno.test("item409 · hollow reader fields are omitted, machine channels are kept", () => {
  const out = applyBiometricHollowOmission({
    enforcement_precedents: [],
    annotations: [],
    lint_warnings: [],
  });
  assert(!("enforcement_precedents" in out));
  assert("annotations" in out);
  assert("lint_warnings" in out);
});

Deno.test("item409 · no contract enum survives the repaired opener", () => {
  const before =
    "On the intake as supplied, this framework applies conditionally — Employer (employee biometrics) organisation processing Fingerprint / palm print for the stated purpose: Time & attendance / workforce management.";
  const after = repairApparatusOpener(before);
  for (const opt of BIOMETRIC_ENUM_OPTIONS) {
    if (opt === "Other") continue; // a bare word, not a leak signature
    assert(!after.includes(opt), `enum leak survived: ${opt}`);
  }
});

// ── 5. THE OPENER FIX, BOTH DIRECTIONS ──────────────────────────────────────

Deno.test("item409 · the walked-render opener is repaired (R1 + R3)", () => {
  const before =
    "Illinois, USA (BIPA) — BIPA, 740 ILCS 14\n\nOn the intake as supplied, this framework applies conditionally — Employer (employee biometrics) organisation processing Fingerprint / palm print for the stated purpose: Time & attendance / workforce management. BIPA applies to private entities in Illinois.";
  const after = repairApparatusOpener(before);
  assert(
    after.includes(
      "This framework applies to the processing described, conditionally on the intake as supplied. The organisation is an employer processing employee biometrics, and it processes fingerprint or palm-print data for time and attendance and workforce management.",
    ),
    after,
  );
  assert(!after.includes("for the stated purpose:"));
  assert(!after.includes("— Employer"));
  // The determination now takes the sentence's first position.
  assert(/(^|\n\n)This framework applies/m.test(after));
  // The rest of the paragraph is untouched.
  assert(after.includes("BIPA applies to private entities in Illinois."));
});

Deno.test("item409 · already-repaired prose is left alone (idempotent)", () => {
  const good =
    "This framework applies to the processing described, conditionally on the intake as supplied. The organisation is a healthcare provider, and it processes voiceprints for customer authentication.";
  assertEquals(repairApparatusOpener(good), good);
  assertEquals(repairBiometricProse(good, PASSAGES), good);
  assertEquals(repairBiometricProse(repairBiometricProse(good, PASSAGES), PASSAGES), good);
});

Deno.test("item409 · multi-type and idle descriptions render as prose", () => {
  assertEquals(
    describeProcessingAsProse(
      "Consumer app or platform organisation processing Facial geometry / facial recognition, Iris or retina scan for the stated purpose: Customer authentication",
    ),
    "The organisation is a consumer app or platform, and it processes facial geometry and iris or retina scans for customer authentication.",
  );
  assertEquals(
    describeProcessingAsProse("Research organisation organisation with no active biometric processing currently deployed"),
    "The organisation is a research organisation, and the record describes no biometric processing currently deployed.",
  );
});

Deno.test("item409 · the requirements heading loses its enum and its label", () => {
  const after = repairRequirementsHeading(
    "Key requirements for Employer (employee biometrics) using Fingerprint / palm print:",
  );
  assertEquals(
    after,
    "The requirements that attach here, for an employer processing employee biometrics using fingerprint or palm-print data:",
  );
});

// ── 6. SEAM BATTERY + R11 OVER AN ASSEMBLED DOCUMENT ────────────────────────

const bipa15a = PASSAGES.find((p) => p.corpus_key === "il-bipa-740-14-15-a")!;
const bipa15b = PASSAGES.find((p) => p.corpus_key === "il-bipa-740-14-15-b")!;

function assembleBiometricDocument(): string {
  return [
    "Illinois, USA (BIPA) — Biometric Information Privacy Act, 740 ILCS 14",
    "",
    "On the intake as supplied, this framework applies conditionally — Employer (employee biometrics) organisation processing Fingerprint / palm print for the stated purpose: Time & attendance / workforce management. BIPA applies to private entities in Illinois that collect biometric identifiers.",
    "",
    "Key requirements for Employer (employee biometrics) using Fingerprint / palm print:",
    `1. ${bipa15a.pinpoint}: ${bipa15a.bytes}`,
    `2. ${bipa15b.pinpoint}: ${bipa15b.bytes}`,
    "",
    "Consent and notice:",
    "A written release is required BEFORE collection; statutes of other states are OUT OF SCOPE here.",
    "",
    "Current enforcement posture:",
    "Illinois plaintiffs bring class actions under the private right of action.",
    "",
    "Compliance risk rating: CRITICAL",
  ].join("\n");
}

Deno.test("item409 · the seam repairs the assembled document and leaves the passages byte-identical", () => {
  const before = assembleBiometricDocument();
  const after = repairBiometricProse(before, PASSAGES);

  // Register repaired.
  assert(after.includes("This framework applies to the processing described"));
  assert(!after.includes("for the stated purpose:"));
  assert(!after.includes("Key requirements for Employer"));
  assert(after.includes("out of scope"));
  assert(after.includes("before collection"));

  // The determination enum is machinery and survives.
  assert(after.includes("Compliance risk rating: CRITICAL"));

  // The passages survive byte for byte.
  assert(after.includes(bipa15a.bytes), "15(a) passage was altered");
  assert(after.includes(bipa15b.bytes), "15(b) passage was altered");
  assertEquals(checkPassagesSurviveAssembly(after, PASSAGES), []);
});

Deno.test("item409 · a passage mutated by assembly is caught", () => {
  const mangled = assembleBiometricDocument().replace(bipa15a.bytes, bipa15a.bytes.replace(/\s+/g, "  "));
  const drift = checkPassagesSurviveAssembly(mangled, PASSAGES);
  assert(drift.some((d) => d.reason === "assembled_bytes_altered"), JSON.stringify(drift));
});

Deno.test("item409 · passage spans are non-overlapping and ordered", () => {
  const spans = passageSpans(assembleBiometricDocument(), PASSAGES);
  assert(spans.length >= 2);
  for (let i = 1; i < spans.length; i++) assert(spans[i][0] >= spans[i - 1][1]);
});

Deno.test("item409 · R11 assembled-prose lint over the final rendered strings", () => {
  const { report } = applyBiometricProseGold(
    {
      assessment_text: assembleBiometricDocument(),
      jurisdictions_analysed: ["Illinois, USA (BIPA)"],
      enforcement_precedents: [],
      annotations: [],
      lint_warnings: [],
      duty_findings: [
        { id: bipa15a.id, citation: bipa15a.citation, pinpoint: bipa15a.pinpoint, quote: bipa15a.bytes, finding: "The duty is record_insufficient on the record as supplied." },
      ],
      _meta: { build_stamp: "bio-reg" },
    },
    PASSAGES,
  );
  const r11 = lintAssembledProse(report);
  assertEquals(
    r11.findings.map((f) => `${f.rule}@${f.path ?? ""}`),
    [],
  );
  // The duty finding's internal vocabulary was rewritten; the quote was not.
  const df = (report.duty_findings as Array<Record<string, string>>)[0];
  assert(!df.finding.includes("record_insufficient"));
  assertEquals(df.quote, bipa15a.bytes);
  assertEquals(df.citation, bipa15a.citation);
});

// ── 7. THE STAMP ────────────────────────────────────────────────────────────

Deno.test("item409 · the stamp is written at the finalize point", () => {
  const { report } = applyBiometricProseGold({ assessment_text: "x", _meta: {} }, PASSAGES);
  const internal = (report._meta as Record<string, Record<string, string>>).internal;
  assertEquals(internal.biometric_pipeline_stamp, BIOMETRIC_PIPELINE_STAMP);
  assertEquals(internal.biometric_prose_gold_version, BIOMETRIC_PROSE_GOLD_VERSION);
  assertEquals(BIOMETRIC_PIPELINE_STAMP, "biometric-pipeline@item412d-2026-08-08");
});

Deno.test("item409 · the stamp survives the LEAK-PREV-P2 serializer", () => {
  const { report } = applyBiometricProseGold(
    { assessment_text: "x", jurisdictions_analysed: [], _meta: { build_stamp: "b" } },
    PASSAGES,
  );
  const { report: serialized, telemetry } = serializeCustomerReport(
    report as Record<string, unknown>,
    BIOMETRIC_REPORT_SCHEMA,
  );
  assert(!telemetry.crashed);
  const s = serialized as Record<string, unknown>;
  s._meta = { ...(report._meta as Record<string, unknown>), ...(s._meta as Record<string, unknown>) };
  const internal = (s._meta as Record<string, Record<string, string>>).internal;
  assertEquals(internal.biometric_pipeline_stamp, BIOMETRIC_PIPELINE_STAMP);
});
