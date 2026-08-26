// ITEM 417 LEG D — IR REFINEMENT WIRING.
//
// Identities:
//   item417 config invariants: product, version pins, prompts carry the leg-C blocks
//   item417 refusal I1 determination and verdict fields are protected
//   item417 refusal I2 enum, date and name keys are protected
//   item417 refusal I3 citations and verbatim authority text are protected
//   item417 refusal I4 BARRED-LEAF CANARY: the template-vs-authority framing note
//   item417 refusal I5 notification clocks and statutory deadlines are protected
//   item417 refusal I6 the item414 unrecorded-section ledger machinery is protected
//   item417 refusal I7 machine identifiers are protected
//   item417 refusal I8 anchor_keys is protected
//   item417 refusal I9 spine section ids are computed from the spine, never re-typed
//   item417 the blank-by-design worksheet is a protected root at any depth
//   item417 designed-output splice canary: the standing placeholder survives a full pass
//   item417 fail-open BYTE-IDENTITY on critic error
//   item417 fail-open BYTE-IDENTITY on verifier error
//   item417 monolith guard: playbook_text is spliced SPAN-LEVEL
//   item417 monolith guard: a whole-leaf replacement is rejected and the leaf restored
//   item417 telemetry shape carries findings_log and full bucket accounting
//   item417 the stamp is item417

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  IR_LEAF_MIN_RETAINED_FRACTION,
  IR_MONOLITH_LEAF_PATHS,
  IR_PROTECTED_SPINE_SECTION_IDS,
  IR_REFINEMENT_CONFIG,
  IR_REFINEMENT_VERSION,
  checkLeafIntegrity,
  irProtectedReason,
  isIrProtectedPath,
  runIrRefinement,
  spanSplice,
  type RefinementDeps,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-refinement.ts";
import {
  IR_REFINEMENT_CONFIG_VERSION,
  IR_WATCH_CLASSES,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-refinement-config.ts";
import {
  IR_PIPELINE_STAMP,
  IR_SECTION_SPECS,
} from "../../../supabase/functions/generate-ir-playbook/_local/prose/ir.spine.ts";
import { STANDING_TO_COMPLETE } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-prose-gold.ts";

const NARRATIVE_HEAD =
  "Meridian-free narrative. The organisation discovered the incident and convened the response team under its standing arrangements.\n\n";
const NARRATIVE_MID =
  "Under Article 33(1) GDPR the controller notifies the supervisory authority without undue delay and, where feasible, not later than 72 hours after becoming aware.\n\n";
const NARRATIVE_TAIL =
  "The response proceeds from the recorded containment state and the recorded categories of affected data.\n";

const QUOTE = "the response team under its standing arrangements";
const BETTER = "the response team under its recorded standing arrangements";

function longNarrative(): string {
  // A real monolith: over the dynamic threshold and well over any section leaf.
  return NARRATIVE_HEAD + NARRATIVE_MID.repeat(20) + NARRATIVE_TAIL;
}

function deps(findings: unknown[], approveAll = true): RefinementDeps {
  return {
    critic: () => Promise.resolve(JSON.stringify({ findings, structural_findings: [] })),
    verifier: () =>
      Promise.resolve(JSON.stringify({
        verdicts: (findings as { path: string }[]).map((f) => ({
          path: f.path,
          verdict: approveAll ? "approve" : "reject",
          reason: "ok",
        })),
      })),
  };
}

function baseDoc(): Record<string, unknown> {
  return {
    playbook_text: longNarrative(),
    standing_playbook: {
      title: "Incident response playbook",
      template_note:
        "This playbook is drafted from NIST SP 800-61r3 and the ICO breach-management toolkit as TEMPLATES. Neither is legal authority for this organisation.",
      unrecorded_ledger:
        "This playbook still needs the response-team roster and the outside-counsel contact before it can be relied on.",
      sections: [
        {
          kind: "note",
          id: "activation_criteria",
          heading: "Activation criteria",
          status: "recorded",
          body: [
            "The playbook activates when the security team confirms unauthorised access to a system holding personal data.",
          ],
          standard: "Article 33(1) GDPR",
          standard_citation: "GDPR art. 33(1)",
          verdict: "notify",
        },
        {
          kind: "note",
          id: "response_team",
          heading: "Response team and alternates",
          status: "to_complete",
          body: [STANDING_TO_COMPLETE],
        },
      ],
    },
    incident_worksheet: {
      title: "Incident worksheet",
      blank_by_design: true,
      forms: [{ id: "incident_log", heading: "Incident log", columns: ["Time (UTC)", "Observation"], blank_rows: 12 }],
    },
    sa_notification_determination: { decision: "notify", reason: "Above the Article 33(1) threshold." },
    notification_duties: { regimes: ["United Kingdom — ICO notification within 72 hours of awareness."] },
    authority_exhibit: { version: "v1", heading: "Authorities", entries: [{ citation: "GDPR art. 33(1)", excerpt: "…" }] },
    anchor_keys: ["cause", "dataTypes"],
    _meta: { internal: {} },
  };
}

// ── 1. CONFIG INVARIANTS ────────────────────────────────────────────────────

Deno.test("item417 config invariants: product, version pins, prompts carry the leg-C blocks", () => {
  assertEquals(IR_REFINEMENT_CONFIG.product, "ir-playbook");
  assertEquals(IR_REFINEMENT_CONFIG.version, IR_REFINEMENT_VERSION);
  assertEquals(IR_REFINEMENT_VERSION, "refine-ir-2026-08-09-item417");
  assertEquals(IR_REFINEMENT_CONFIG_VERSION, "ir-refine-config-2026-08-09-item416");
  assertEquals(IR_WATCH_CLASSES.length, 8);
  // The critic prompt is the shared core + the leg-C watchlist; the verifier
  // prompt is the shared core + the leg-C designed-output exemplars.
  assert(IR_REFINEMENT_CONFIG.criticSystemPrompt.includes("IR-PLAYBOOK-SPECIFIC WATCHLIST"));
  assert(IR_REFINEMENT_CONFIG.criticSystemPrompt.includes("W-COPYEDIT"));
  assert(IR_REFINEMENT_CONFIG.verifierSystemPrompt.includes("xp-ir-1"));
  assert(IR_REFINEMENT_CONFIG.verifierSystemPrompt.includes("xp-ir-6"));
  assertEquals(IR_MONOLITH_LEAF_PATHS, ["$.playbook_text"]);
  assertEquals(IR_LEAF_MIN_RETAINED_FRACTION, 0.9);
});

// ── 2. REFUSAL, ONE PER PROTECTED CLASS ─────────────────────────────────────

Deno.test("item417 refusal I1 determination and verdict fields are protected", () => {
  for (const p of ["$.standing_playbook.sections[0].verdict", "$.sa_notification_determination.decision"]) {
    assert(isIrProtectedPath(p), p);
  }
});

Deno.test("item417 refusal I2 enum, date and name keys are protected", () => {
  for (
    const p of [
      "$.standing_playbook.sections[0].kind",
      "$.standing_playbook.sections[0].heading",
      "$.standing_playbook.title",
      "$.generated_at",
    ]
  ) assert(isIrProtectedPath(p), p);
});

Deno.test("item417 refusal I3 citations and verbatim authority text are protected", () => {
  for (
    const p of [
      "$.standing_playbook.sections[0].standard",
      "$.standing_playbook.sections[0].standard_citation",
      "$.authority_exhibit.entries[0].excerpt",
    ]
  ) assert(isIrProtectedPath(p), p);
});

Deno.test("item417 refusal I4 BARRED-LEAF CANARY: the template-vs-authority framing note", () => {
  // IR CONVERSION I0 (2026-08-26): standing_playbook is now ALSO a protected
  // root (see IR_PROTECTED_ROOTS), which is checked before leaf keys and so
  // now wins the reason string on this real-world path — a strict widening
  // of protection, not a weakening. Assert the real path is protected under
  // the (new, broader) reason, and independently exercise the I4 LEAF-KEY
  // mechanism itself on a path outside any protected root, so the leaf-key
  // defense stays verified on its own (defense in depth against a future
  // change to the root list).
  assertEquals(irProtectedReason("$.standing_playbook.template_note"), "standing_playbook");
  assertEquals(irProtectedReason("$.some_other_surface.template_note"), "template_note");
});

Deno.test("item417 refusal I5 notification clocks and statutory deadlines are protected", () => {
  for (const p of ["$.standing_playbook.deadline", "$.standing_playbook.sections[0].hours_remaining"]) {
    assert(isIrProtectedPath(p), p);
  }
});

Deno.test("item417 refusal I6 the item414 unrecorded-section ledger machinery is protected", () => {
  // See the I4 test above: standing_playbook's new root protection now wins
  // the reason string on this real path; the leaf-key mechanism itself is
  // independently exercised outside any protected root.
  assertEquals(irProtectedReason("$.standing_playbook.unrecorded_ledger"), "standing_playbook");
  assertEquals(irProtectedReason("$.some_other_surface.unrecorded_ledger"), "unrecorded_ledger");
  assert(isIrProtectedPath("$.standing_playbook.information_needed"));
});

Deno.test("item417 refusal I7 machine identifiers are protected", () => {
  for (const p of ["$.standing_playbook.sections[0].id", "$.build_stamp", "$.standing_playbook.section_order"]) {
    assert(isIrProtectedPath(p), p);
  }
});

Deno.test("item417 refusal I8 anchor_keys is protected", () => {
  assertEquals(irProtectedReason("$.anchor_keys"), "anchor_keys");
});

Deno.test("item417 refusal I9 spine section ids are computed from the spine, never re-typed", () => {
  assertEquals(IR_PROTECTED_SPINE_SECTION_IDS, IR_SECTION_SPECS.map((s) => s.id));
  assert(IR_PROTECTED_SPINE_SECTION_IDS.length >= 20);
  assert(isIrProtectedPath("$.standing_playbook.activation_criteria"));
});

Deno.test("item417 the blank-by-design worksheet is a protected root at any depth", () => {
  assertEquals(irProtectedReason("$.incident_worksheet.forms[0].blank_rows"), "incident_worksheet");
  assertEquals(irProtectedReason("$.notification_duties.regimes[0]"), "notification_duties");
});

// IR CONVERSION I0 (2026-08-26) — DEFECT FIX. Live telemetry (row
// 831c40f0-4e70-471e-90d7-142ff9966d87, 2026-08-09) proved the splicer could
// reach $.standing_playbook.sections[N].body — a real free-text leaf with no
// I1–I9 key-name match — before standing_playbook was a protected root.
// state_notification_duties (SO-FT FIX 3, added after this file's original
// authoring) never got the same root protection its GDPR sibling
// notification_duties has always had, despite feeding the customer-facing
// notificationDeadlines slot on every run via buildDeadlinesProse.
Deno.test("item417 IR-I0 fix: standing_playbook is a protected root at any depth, including body/record_fact/application/rows", () => {
  for (
    const p of [
      "$.standing_playbook.sections[7].body[0]",
      "$.standing_playbook.sections[0].record_fact",
      "$.standing_playbook.sections[0].application",
      "$.standing_playbook.sections[3].rows[1][2]",
    ]
  ) assertEquals(irProtectedReason(p), "standing_playbook", p);
});

Deno.test("item417 IR-I0 fix: state_notification_duties is a protected root at any depth", () => {
  for (
    const p of [
      "$.state_notification_duties[0].state_label",
      "$.state_notification_duties[0].citation",
      "$.state_notification_duties[0].individual_deadline",
      "$.state_notification_duties[0].regulator_deadline",
    ]
  ) assertEquals(irProtectedReason(p), "state_notification_duties", p);
});

// ── 3. CANARIES THROUGH A FULL PASS ─────────────────────────────────────────

Deno.test("item417 designed-output splice canary: the standing placeholder survives a full pass", async () => {
  const doc = baseDoc();
  const noteBefore = (doc.standing_playbook as any).template_note;
  // Two proposals, two different defences:
  //   • the framing note is killed IN CODE (barred leaf, pre-GPT);
  //   • the standing placeholder is designed output (xp-ir-3) and is killed by
  //     the VERIFIER — the canary proves the pass carries both defences.
  const findings = [
    {
      path: "$.standing_playbook.template_note",
      quote: "TEMPLATES",
      class: "register-defect",
      anchor: "n/a",
      replacement: "requirements",
      confidence: "high",
    },
    {
      path: "$.standing_playbook.sections[1].body[0]",
      quote: STANDING_TO_COMPLETE,
      class: "generic-boilerplate",
      anchor: "n/a",
      replacement: "The response team is the CISO and the DPO.",
      confidence: "high",
    },
  ];
  const tel = await runIrRefinement(doc, { organizationName: "Acme" }, {
    critic: () => Promise.resolve(JSON.stringify({ findings, structural_findings: [] })),
    verifier: () =>
      Promise.resolve(JSON.stringify({
        verdicts: [{
          path: "$.standing_playbook.sections[1].body[0]",
          verdict: "reject",
          reason: "new-fact: the record does not name a response team",
        }],
      })),
  });
  // BARRED-LEAF CANARY — byte-identical, and killed before the verifier saw it.
  assertEquals((doc.standing_playbook as any).template_note, noteBefore);
  // IR CONVERSION I0 (2026-08-26): standing_playbook is now a protected root,
  // so BOTH proposals in this canary — the framing note and the standing
  // placeholder — are killed in code under that one root reason, before
  // either reaches the verifier. This is a strict widening (the designed-
  // output placeholder no longer depends on the verifier's judgment call at
  // all), so the canary now proves code-level protection for both, not one
  // code-killed + one verifier-killed as originally designed.
  assertEquals(tel.protected_rejected.count, 2);
  for (const item of tel.protected_rejected.items) {
    assertEquals(item.leaf_key_or_rule, "standing_playbook");
  }
  // DESIGNED-OUTPUT CANARY — the standing placeholder is untouched.
  assertEquals((doc.standing_playbook as any).sections[1].body[0], STANDING_TO_COMPLETE);
  assertEquals(tel.spliced, 0);
});

// ── 4. FAIL-OPEN ────────────────────────────────────────────────────────────

Deno.test("item417 fail-open BYTE-IDENTITY on critic error", async () => {
  const doc = baseDoc();
  const before = JSON.stringify(doc);
  const tel = await runIrRefinement(doc, {}, {
    critic: () => Promise.reject(new Error("claude down")),
    verifier: () => Promise.resolve("{}"),
  });
  assertEquals(JSON.stringify(doc), before);
  assertEquals(tel.spliced, 0);
  assert(tel.crashed === null || typeof tel.crashed === "string");
});

Deno.test("item417 fail-open BYTE-IDENTITY on verifier error", async () => {
  const doc = baseDoc();
  const before = JSON.stringify(doc);
  const tel = await runIrRefinement(doc, {}, {
    critic: () =>
      Promise.resolve(JSON.stringify({
        findings: [{
          path: "$.playbook_text",
          quote: QUOTE,
          class: "generic-boilerplate",
          anchor: "record",
          replacement: BETTER,
          confidence: "high",
        }],
        structural_findings: [],
      })),
    verifier: () => Promise.reject(new Error("gpt down")),
  });
  assertEquals(JSON.stringify(doc), before);
  assertEquals(tel.spliced, 0);
});

// ── 5. MONOLITH-LEAF GUARD, BOTH DIRECTIONS ─────────────────────────────────

Deno.test("item417 monolith guard: playbook_text is spliced SPAN-LEVEL", async () => {
  const doc = baseDoc();
  const before = doc.playbook_text as string;
  const tel = await runIrRefinement(doc, {}, deps([{
    path: "$.playbook_text",
    quote: QUOTE,
    class: "generic-boilerplate",
    anchor: "record",
    replacement: BETTER,
    confidence: "high",
  }]));
  const after = doc.playbook_text as string;
  assertEquals(after, before.replace(QUOTE, BETTER));
  assertEquals(after.length, before.length + (BETTER.length - QUOTE.length));
  assert(after.includes(NARRATIVE_TAIL));
  assertEquals(tel.span_spliced_paths, ["$.playbook_text"]);
  assertEquals(tel.leaf_guard_rejected.count, 0);
  assertEquals(tel.artifact_pass_mode, "single_pass_over_persisted_record");
});

Deno.test("item417 monolith guard: a whole-leaf replacement is rejected and the leaf restored", async () => {
  const doc = baseDoc();
  const before = doc.playbook_text as string;
  const tel = await runIrRefinement(doc, {}, deps([{
    path: "$.playbook_text",
    quote: before.slice(0, 800),
    class: "generic-boilerplate",
    anchor: "record",
    replacement: "A short rewritten playbook.",
    confidence: "high",
  }]));
  assertEquals(doc.playbook_text, before);
  assertEquals(tel.leaf_guard_rejected.count, 1);
  assertEquals(tel.leaf_guard_rejected.items[0].path, "$.playbook_text");
  assertEquals(tel.leaf_guard_rejected.items[0].reason, "shrank_below_floor");
  assertEquals(tel.spliced, 0);
  assertEquals(tel.spliced_paths, []);
});

Deno.test("item417 the span splicer and the guard are pure and deterministic", () => {
  assertEquals(spanSplice("abcabc", "b", "X"), "aXcabc");
  assertEquals(spanSplice("abc", "zz", "X"), null);
  assertEquals(checkLeafIntegrity("$.p", "abcdef", "abXdef", "c", "X"), null);
  const bad = checkLeafIntegrity("$.p", "abcdefghij", "X", "abcdefghi", "X");
  assert(bad && bad.reason === "whole_leaf_replacement");
});

// ── 6. TELEMETRY SHAPE ──────────────────────────────────────────────────────

Deno.test("item417 telemetry shape carries findings_log and full bucket accounting", async () => {
  const doc = baseDoc();
  const tel = await runIrRefinement(doc, {}, deps([{
    path: "$.playbook_text",
    quote: QUOTE,
    class: "generic-boilerplate",
    anchor: "record",
    replacement: BETTER,
    confidence: "high",
  }]));
  for (
    const k of [
      "version",
      "enabled",
      "critic_findings",
      "structural_findings",
      "verifier_approved",
      "verifier_rejected",
      "spliced",
      "quote_drift",
      "protected_rejected",
      "cap_overflow",
      "capped",
      "crashed",
      "spliced_paths",
      "findings_log",
      "necessity_rejected",
      "verifier_reject_reasons",
      "omission_findings",
      "omission_unanchored",
      "coverage_supplied",
      "leaf_guard_rejected",
      "span_spliced_paths",
      "monolith_paths_detected",
      "artifact_pass_mode",
    ]
  ) assert(k in tel, `missing telemetry key ${k}`);
  assertEquals(tel.version, IR_REFINEMENT_VERSION);
  assertEquals(tel.findings_log.length, 1);
  assertEquals(tel.findings_log[0].path, "$.playbook_text");
  assert(tel.monolith_paths_detected.includes("$.playbook_text"));
});

Deno.test("item417 the stamp is item417", () => {
  assertEquals(IR_PIPELINE_STAMP, "ir-pipeline@item-so7-2026-08-10");
});
