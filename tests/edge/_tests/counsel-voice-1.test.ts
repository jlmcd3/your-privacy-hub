// COUNSEL-VOICE-1 — regression tests for the advisory-voice recast and the
// E-completion deterministic checks. Kept under supabase/functions/_tests/
// so `deno test` picks it up alongside grader-cal-1.test.ts.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ADVISORY_CLOSE_CLARIFICATION,
  ADVISORY_CLOSE_INVESTIGATION,
  ADVISORY_CLOSE_ANY_RE,
  COUNSEL_REFERRAL_RE,
  hasCounselReferral,
  scanAdvisoryVoice,
} from "../../../supabase/functions/_shared/advisory-voice.ts";
import { applyGraderCal1Filter } from "../../../supabase/functions/_shared/grader/post-filters.ts";
import { GRADER_CONTEXT_VERSION } from "../../../supabase/functions/_shared/grader/context.ts";
import {
  runFormatChecksDPA,
  runFormatChecksIR,
} from "../../../supabase/functions/_shared/grader/format-checks.ts";

// ─── §1: advisory formulas exist and are correctly spelled ───────────

Deno.test("COUNSEL-VOICE-1: canonical closes have exact spelling", () => {
  assertEquals(ADVISORY_CLOSE_CLARIFICATION, "further clarification is advisable.");
  assertEquals(ADVISORY_CLOSE_INVESTIGATION, "further internal investigation is advisable.");
  assert(ADVISORY_CLOSE_ANY_RE.test("...; further clarification is advisable."));
  assert(ADVISORY_CLOSE_ANY_RE.test("...; further internal investigation is advisable."));
});

// ─── §1c: counsel-referral prohibition ───────────────────────────────

Deno.test("COUNSEL-VOICE-1 §1c: prohibition fires on counsel/lawyer/attorney patterns", () => {
  assert(hasCounselReferral("Counsel should confirm the framework before execution."));
  assert(hasCounselReferral("Consult your lawyer before relying on this agreement."));
  assert(hasCounselReferral("This should be reviewed by an attorney."));
  assert(hasCounselReferral("Privacy counsel should assess this before execution."));
  assert(hasCounselReferral("Confirmed with legal counsel."));
});

Deno.test("COUNSEL-VOICE-1 §1c: prohibition does NOT fire on advisory prose", () => {
  const advisory =
    "The record identifies the Processor's jurisdiction of incorporation as Ireland; further clarification is advisable.";
  assert(!hasCounselReferral(advisory));
  const advisory2 =
    "The record does not specify retention practices for backups; further internal investigation is advisable.";
  assert(!hasCounselReferral(advisory2));
});

Deno.test("COUNSEL-VOICE-1 §1c: page-level disclaimer text does NOT fire the check", () => {
  // Text mirroring src/components/ToolDisclaimer.tsx first paragraph — the
  // page-level disclaimer sits OUTSIDE generator output; but even if the
  // substring appeared in body text, the guarded checker scans only the
  // body-text tokens listed in COUNSEL_REFERRAL_RE. The disclaimer's
  // literal string does mention "qualified legal counsel"; that's why we
  // scan generator output, not the disclaimer component itself. This test
  // documents that the regex intentionally captures that phrase — the
  // disclaimer is exempt because it's rendered by a separate component,
  // not concatenated into body text.
  const disclaimerPhrase =
    "This document is not legal advice and must be reviewed by qualified legal counsel before any operational use or reliance.";
  assert(COUNSEL_REFERRAL_RE.test(disclaimerPhrase));
});

// ─── §1b: specificity invariant ──────────────────────────────────────

Deno.test("COUNSEL-VOICE-1 §1b: bare advisory close is flagged", () => {
  const bare = "Unknown; further clarification is advisable.";
  const findings = scanAdvisoryVoice(bare);
  assert(findings.some((f) => f.code === "bare_advisory_close"));
});

Deno.test("COUNSEL-VOICE-1 §1b: named-fact advisory sentence passes", () => {
  const good =
    "The record identifies the Processor's jurisdiction of incorporation as Ireland; further clarification is advisable.";
  const findings = scanAdvisoryVoice(good);
  assert(!findings.some((f) => f.code === "bare_advisory_close"));
});

// ─── §3: grader post-filter retarget ─────────────────────────────────

Deno.test("COUNSEL-VOICE-1 §3: advisory-formula sentences are protected from leak-rubric", () => {
  const { kept, dropped } = applyGraderCal1Filter([{
    check_id: "rubric_internal_reasoning_leak",
    dimension: "hallucination",
    severity: "high",
    passed: false,
    evidence:
      "The record identifies the Processor's jurisdiction of incorporation as Ireland; further clarification is advisable.",
  }]);
  assertEquals(kept.length, 0);
  assertEquals(dropped.a2, 1);
});

// ITEM 387 (b): the "legacy NOTE FOR LEGAL REVIEW is still whitelisted"
// test is DELETED. GRADER-CAL-2 Task 5 deliberately removed
// LEGACY_NOTE_BLOCK_RE from the post-filter drop path (see
// _shared/grader/post-filters.ts) because current generator prompts
// prohibit the heading outright, so dropping such findings masked real
// defects. The back-compat behaviour it pinned no longer exists.

Deno.test("COUNSEL-VOICE-1 §3: genuine self-narration outside formulas still fires", () => {
  const { kept } = applyGraderCal1Filter([{
    check_id: "rubric_internal_reasoning_leak",
    dimension: "hallucination",
    severity: "high",
    passed: false,
    evidence: "As an AI language model, I cannot advise on …",
  }]);
  assertEquals(kept.length, 1);
});

// ─── §3: version bump ────────────────────────────────────────────────

Deno.test("COUNSEL-VOICE-1: GRADER_CONTEXT_VERSION bumped", () => {
  // ITEM 387 (a): gc-2026-07-26-s5 → gc-2026-07-27-s6 (grader/context.ts).
  assertEquals(GRADER_CONTEXT_VERSION, "gc-2026-07-27-s6-eu-uk-ca-au-sg");
});

// ─── §4: E-checks per tool ───────────────────────────────────────────

Deno.test("COUNSEL-VOICE-1 E1 (DPA): missing required section is flagged", () => {
  const stub = "# Parties and Recitals\n\nStub body.";
  const findings = runFormatChecksDPA(stub);
  assert(findings.some((f) => f.check_id === "e1_section_present" && !f.passed));
});

Deno.test("COUNSEL-VOICE-1 E3: unclosed [TO BE COMPLETED bracket is flagged", () => {
  const bad = "This shall be finalised by [TO BE COMPLETED — insert deadline\n\nEnd of paragraph.";
  const findings = runFormatChecksDPA(bad);
  assert(findings.some((f) => f.check_id === "e3_tbc_unclosed" && !f.passed));
});

Deno.test("COUNSEL-VOICE-1 E3: properly closed [TO BE COMPLETED passes", () => {
  const good = "This shall be finalised by [TO BE COMPLETED — insert deadline].";
  const findings = runFormatChecksDPA(good);
  assert(findings.some((f) => f.check_id === "e3_tbc_brackets_ok" && f.passed));
});

Deno.test("COUNSEL-VOICE-1 E4: instruction leak is flagged", () => {
  const bad = "As an AI language model, I cannot advise on this obligation.";
  const findings = runFormatChecksDPA(bad);
  assert(findings.some((f) => f.check_id === "e4_instruction_leak" && !f.passed));
});

Deno.test("COUNSEL-VOICE-1 E5: bare advisory close is flagged", () => {
  const bad = "Unknown; further clarification is advisable.";
  const findings = runFormatChecksDPA(bad);
  assert(findings.some((f) => f.check_id === "e5_bare_advisory_close" && !f.passed));
});

Deno.test("COUNSEL-VOICE-1 E6: body-text counsel referral is flagged", () => {
  const bad = "Consult your lawyer before relying on this document.";
  const findings = runFormatChecksDPA(bad);
  assert(findings.some((f) => f.check_id === "e6_counsel_referral" && !f.passed));
});

Deno.test("COUNSEL-VOICE-1 E1 (IR): required numbered-section presence", () => {
  // ITEM 387 (a): SWEEP-2R R1 retargeted IR_REQUIRED_SECTIONS from the stale
  // "PART A".."PART F" list to the seven numbered headings the shipped
  // instrument (generate-ir-playbook v3.9.1) actually emits.
  const good = [
    "## Section 1: IMMEDIATE ACTIONS",
    "## Section 2: BREACH ASSESSMENT CHECKLIST",
    "## Section 3: REGULATORY NOTIFICATION TIMELINE",
    "## Section 4: INDIVIDUAL NOTIFICATION DECISION TREE",
    "## Section 5: NOTIFICATION TEMPLATES",
    "## Section 6: DOCUMENTATION & ACCOUNTABILITY CHECKLIST",
    "## Section 7: POST-INCIDENT ACTIONS",
  ].map((h) => h + "\ncontent").join("\n");
  const findings = runFormatChecksIR(good);
  assert(findings.some((f) => f.check_id === "e1_sections_ok" && f.passed));
});

// ─── §4 E-check list emitted per tool (report for humans) ────────────

Deno.test("COUNSEL-VOICE-1: DPA emits the expected E1-E6 check ids", () => {
  const findings = runFormatChecksDPA(
    "# Parties and Recitals\n## Definitions\n### Subject Matter\n" +
    "# Data Processing\n# Sub-processing\n# Data Subject Rights\n" +
    "# Security\n# Data Transfers\n# Return or Deletion\n# Term and Termination\n" +
    "The record identifies X; further clarification is advisable."
  );
  const ids = new Set(findings.map((f) => f.check_id));
  for (const id of ["e1_sections_ok", "e2_heading_hierarchy_ok", "e3_tbc_brackets_ok",
                    "e4_no_instruction_leak", "e5_advisory_formula_ok", "e6_no_counsel_referral"]) {
    assert(ids.has(id) || findings.some((f) => f.check_id.startsWith(id.split("_")[0])),
      `expected an E-check row for ${id}`);
  }
});

// ─── §4b: IR privilege carve-out (COUNSEL-VOICE-1B Task 3) ───────────

Deno.test("COUNSEL-VOICE-1B: IR privilege sentences do NOT fire E6", () => {
  const irPrivilege =
    "PART A\nx\nPART B\nx\nPART C\nx\nPART D\nx\nPART E\nx\nPART F\nx\n" +
    "The Senior Legal Counsel makes the privilege determination and labels the memo LEGALLY PRIVILEGED.";
  const findings = runFormatChecksIR(irPrivilege);
  assert(!findings.some((f) => f.check_id === "e6_counsel_referral" && !f.passed),
    "IR privilege sentence must be exempt from E6");
});

Deno.test("COUNSEL-VOICE-1B: IR non-privilege counsel referral still fires E6", () => {
  const bad =
    "PART A\nx\nPART B\nx\nPART C\nx\nPART D\nx\nPART E\nx\nPART F\nx\n" +
    "Consult your lawyer before publishing this playbook.";
  const findings = runFormatChecksIR(bad);
  assert(findings.some((f) => f.check_id === "e6_counsel_referral" && !f.passed));
});

// ─── §5: runFormatChecksGeneric wiring (7 remaining tools) ───────────

Deno.test("COUNSEL-VOICE-1B: runFormatChecksGeneric flags bare advisory close", async () => {
  const { runFormatChecksGeneric } = await import("../../../supabase/functions/_shared/grader/format-checks.ts");
  const findings = runFormatChecksGeneric("Unknown; further clarification is advisable.");
  assert(findings.some((f) => f.check_id === "e5_bare_advisory_close" && !f.passed));
});

Deno.test("COUNSEL-VOICE-1B: extractProseFromReport skips reserved keys", async () => {
  const { extractProseFromReport } = await import("../../../supabase/functions/_shared/advisory-voice.ts");
  const rd = {
    executive_summary: "Consult your attorney about this obligation.",
    _meta: { prompt_version: "should-be-skipped" },
    deterministic_checks: [{ check_id: "shouldnt", passed: true }],
    body: { narrative: "The record does not specify retention; further internal investigation is advisable." },
  };
  const prose = extractProseFromReport(rd);
  assert(prose.includes("Consult your attorney"), "should include body strings");
  assert(!prose.includes("should-be-skipped"), "should skip _meta");
});

// ─── CV1-FF: rulebook prohibition on NOTE FOR LEGAL REVIEW emission ─────

Deno.test("CV1-FF: DPA + IR rulebooks contain zero NOTE-FOR-LEGAL-REVIEW emission instructions", async () => {
  const files = [
    new URL("../../../supabase/functions/generate-dpa/index.ts", import.meta.url),
    new URL("../../../supabase/functions/generate-ir-playbook/index.ts", import.meta.url),
  ];
  const badges = /NOTE FOR LEGAL REVIEW/i;
  // A line is an "instruction context" if it mentions the retired heading
  // and is NOT explicitly a prohibition / comment / description of prior state.
  const isExempt = (line: string) =>
    /\/\//.test(line) ||               // comment marker
    /Do NOT emit/i.test(line) ||
    /NEVER emit/i.test(line) ||
    /retired heading is prohibited/i.test(line) ||
    /is a customer-facing/i.test(line) || // FF-DPA nd1 comment
    /placeholder\)/i.test(line);          // legacy string-form comment

  for (const url of files) {
    const src = await Deno.readTextFile(url);
    const offenders = src.split("\n")
      .map((line, i) => ({ line, no: i + 1 }))
      .filter(({ line }) => badges.test(line) && !isExempt(line));
    assertEquals(
      offenders.length,
      0,
      `Rulebook in ${url.pathname} still emits NOTE FOR LEGAL REVIEW instructions:\n` +
        offenders.map((o) => `  L${o.no}: ${o.line.trim().slice(0, 200)}`).join("\n"),
    );
  }
});

// ─── §5 (CV1-ALL): role-roster exemption + unified E6 id ─────────────

Deno.test("CV1-ALL: role-roster labels do NOT fail E6", () => {
  const text = "The Incident Response Team includes: Miriam Schulz — Legal Counsel; Alex Rossi — Security Lead.";
  const findings = runFormatChecksIR(text);
  const e6 = findings.filter((f) => f.check_id === "e6_counsel_referral" || f.check_id === "e6_no_counsel_referral");
  // No failing counsel-referral finding should be emitted for a role roster.
  assert(!e6.some((f) => f.passed === false), `role roster incorrectly flagged: ${JSON.stringify(e6)}`);
});

Deno.test("CV1-ALL: directive counsel referral still fails E6", () => {
  const text = "All findings should be reviewed with qualified legal counsel before operational use.";
  const findings = runFormatChecksDPA(text);
  const failing = findings.filter((f) => f.check_id === "e6_counsel_referral" && f.passed === false);
  assert(failing.length > 0, "directive counsel referral must fail");
});

Deno.test("CV1-ALL: E5 accepts named-fact anywhere in sentence", () => {
  const text = "Automated deletion of raw telemetry at 90 days must be confirmed as technically implemented — further internal investigation is advisable.";
  const findings = runFormatChecksDPA(text);
  const e5Fails = findings.filter((f) => f.check_id === "e5_bare_advisory_close" && f.passed === false);
  assertEquals(e5Fails.length, 0, `E5 wrongly flagged a well-formed close: ${JSON.stringify(e5Fails)}`);
});

// ─── CV1-R: residual sweep — emitter constants must not carry referral directives ───

Deno.test("CV1-R: generate-report-pdf disclaimer constants have no counsel-referral directive", async () => {
  const src = await Deno.readTextFile(new URL("../../../supabase/functions/generate-report-pdf/index.ts", import.meta.url));
  // The "counsel-review" enum label + "counsel review recommended" tier
  // string (~L1034) is a schema-bound admin label kept per CV1-R decision
  // pending; strip that line before scanning body-text templates.
  // Exempt, too, statutory § 7152(a)(8) participant-roster text (counsel is
  // EXCLUDED from the roster the regulation requires) — same carve-out the
  // universal-disclaimer normalizer makes; it is not a referral directive.
  const scanned = src
    .split("\n")
    .filter((line) =>
      !/=== "counsel-review"/.test(line) && !/Counsel review recommended/i.test(line)
      && !/7152\(a\)\(8\)/.test(line)
    )
    .join("\n");

  const hits = scanned.match(COUNSEL_REFERRAL_RE);
  if (hits) {
    // Provide the offending snippet for debugging.
    const lines = scanned.split("\n")
      .map((l, i) => ({ l, no: i + 1 }))
      .filter(({ l }) => COUNSEL_REFERRAL_RE.test(l));
    throw new Error(
      "generate-report-pdf still carries counsel-referral directives:\n" +
        lines.slice(0, 5).map((x) => `  L${x.no}: ${x.l.trim().slice(0, 220)}`).join("\n"),
    );
  }
});

Deno.test("CV1-R: run-governance-assessment disclaimer constants have no counsel-referral directive", async () => {
  const src = await Deno.readTextFile(new URL("../../../supabase/functions/run-governance-assessment/index.ts", import.meta.url));
  // Rulebook lines describing what the generator MUST NOT emit are exempt,
  // as are role-roster labels ("Legal Counsel" as owner) per CV1-ALL T4.
  const scanned = src.split("\n").filter((l) =>
    // ITEM 387 (a): POST-GOVERNANCE-FIX-1 T2(b) added a rulebook line that
    // NAMES the prohibited counsel-ownership phrasings in order to forbid
    // them ("COUNSEL-REFERRAL ZONE DISCIPLINE"). It is a prohibition line,
    // exactly like the "NEVER emit" family already exempted here.
    !/NEVER direct|no 'consult legal counsel'|NEVER emit|Do not direct|COUNSEL-REFERRAL ZONE DISCIPLINE/i.test(l)
    && !/owner['"]?\s*[:=]\s*['"][^'"]*Legal Counsel/i.test(l)
    && !/["']Legal Counsel["']/.test(l)
  ).join("\n");
  const hits = scanned.match(COUNSEL_REFERRAL_RE);
  if (hits) {
    const lines = scanned.split("\n")
      .map((l, i) => ({ l, no: i + 1 }))
      .filter(({ l }) => COUNSEL_REFERRAL_RE.test(l));
    throw new Error(
      "run-governance-assessment still carries counsel-referral directives:\n" +
        lines.slice(0, 5).map((x) => `  L${x.no}: ${x.l.trim().slice(0, 220)}`).join("\n"),
    );
  }
});

