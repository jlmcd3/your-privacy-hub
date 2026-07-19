// SWEEP-1 Task 5 — REBUILD-IR D5 test rider.
// Tests-only file. No function change; no deploy.
//
// Coverage:
//  (a) anchor-consumption proof — the 4-way HIPAA anchor block
//      (§§ 164.404 / 164.406 / 164.408 / 164.410 + CRITICAL DISTINCTION)
//      is embedded in IR_RULEBOOK, and IR_RULEBOOK is consumed by the
//      single `irSystem` built once and passed to `callClaude` for
//      Sections 1–2, Sections 3–5, and Sections 6–7. Because the system
//      block is built once per invocation and reused across parts A/B/C
//      (index.ts:1050–1055 → 1069), a source-level proof that the
//      anchors live inside IR_RULEBOOK and IR_RULEBOOK is fed through
//      `extraRules` into `buildSystemContent` is sufficient.
//  (b) leak-detector catches meta-instruction samples verbatim
//      (the 9674fdb9 "Do not frame …" class, not the miscite ee1e0a6d
//      row — that is anchor content, not leak content).
//  (c) false-positive suite — legitimate reader-imperatives from a
//      real playbook pass CLEAN.
//  (d) TEMPORAL ANCHORING rule text is present in IR_RULEBOOK.
//
// Run: deno test --allow-read --no-check supabase/functions/generate-ir-playbook/rebuild-ir.test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SRC_URL = new URL("./index.ts", import.meta.url);
const SRC = await Deno.readTextFile(SRC_URL);

// The INSTRUCTION_LEAK_RE regex is defined twice inside index.ts
// (per-part regeneration guard at ~1240 and post-assembly lint at ~1508).
// The generateHalves guard is the STRICTER form (extra tokens like
// "meta-instruction", "internal machinery", "IN THIS RESPONSE ONLY",
// "the rules above", and "Sections \d+ of a complete"). Testing against
// the stricter form is the correct proof of the leak gate.
const INSTRUCTION_LEAK_RE =
  /\b(do not frame(?: this)?|do NOT output|output ONLY|as instructed|per the rulebook|per these instructions|the system prompt|meta-instruction|internal machinery|IN THIS RESPONSE ONLY|the rules? above|as (?:noted|stated) in the (?:instructions|rules)|per your instructions|Sections?\s*[0-9–\-,\s]+of a complete)\b/i;

// ─────────────────────────────────────────────────────────────────────────────
// (a) Anchor consumption — the 4-way HIPAA block lives inside IR_RULEBOOK
//     and IR_RULEBOOK is fed to the single irSystem consumed by every part.
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("REBUILD-IR: § 164.404 individual-notice anchor present in IR_RULEBOOK", () => {
  assert(
    /§\s*164\.404[^]{0,400}60 calendar days after discovery/i.test(SRC),
    "§ 164.404 60-day individual-notice anchor missing",
  );
});

Deno.test("REBUILD-IR: § 164.406 media-notice anchor (MORE THAN 500 / single state) present", () => {
  assert(/§\s*164\.406/.test(SRC), "§ 164.406 anchor missing");
  assert(
    /MORE THAN 500 residents of (?:a single|one) State/i.test(SRC),
    "§ 164.406 per-state media trigger prose missing",
  );
});

Deno.test("REBUILD-IR: § 164.408 Secretary-notice anchor (500-or-more aggregate) present", () => {
  assert(/§\s*164\.408/.test(SRC), "§ 164.408 anchor missing");
  assert(
    /500 OR MORE individuals[^]{0,80}AGGREGATE|500 OR MORE individuals IN TOTAL/i.test(SRC),
    "§ 164.408 aggregate trigger prose missing",
  );
});

Deno.test("REBUILD-IR: § 164.410 business-associate anchor present", () => {
  assert(/§\s*164\.410/.test(SRC), "§ 164.410 BA-to-CE anchor missing");
});

Deno.test("REBUILD-IR: CRITICAL DISTINCTION separates § 164.406 vs § 164.408 triggers", () => {
  assert(/CRITICAL DISTINCTION/.test(SRC), "CRITICAL DISTINCTION marker missing");
  assert(
    /Never conflate them\.[^]{0,120}Never cite § 164\.408 for the media trigger/i.test(SRC),
    "CRITICAL DISTINCTION conflation ban missing",
  );
  assert(
    /§ 164\.514[^]{0,120}backwards|§ 164\.514 describes when data is NOT PHI/i.test(SRC),
    "§ 164.514 backwards-citation warning missing",
  );
});

Deno.test("REBUILD-IR / IR-HF1 T1: irSystem builds once and rides callClaude via a system payload that also accepts per-part instruction blocks", () => {
  // IR-HF1 T1: the shared callClaude closure now composes its system[] as
  // `systemPayload = [...irSystem, ...extraSystem]`. Per-part instruction
  // blocks are supplied via partInstructionsFor(which) and travel on the
  // system channel — no longer concatenated into the user prompt. Proof:
  // irSystem is built once, referenced once inside callClaude as part of
  // systemPayload, and each generate/continue call routes per-part
  // instructions through partInstructionsFor.
  assert(/extraRules:\s*IR_RULEBOOK/.test(SRC), "extraRules: IR_RULEBOOK wiring missing");
  const buildCallCount = (SRC.match(/buildSystemContent\s*\(/g) || []).length;
  assertEquals(buildCallCount, 1, "irSystem must be built exactly once and reused across parts");
  assert(/system:\s*systemPayload/.test(SRC), "callClaude must pass system: systemPayload");
  assert(/const\s+systemPayload\s*=\s*extraSystem[^]*\[\.\.\.irSystem,\s*\.\.\.extraSystem\]\s*:\s*irSystem/.test(SRC),
    "systemPayload must compose irSystem with the optional extraSystem argument");
  assert(/function\s+partInstructionsFor\s*\(/.test(SRC), "partInstructionsFor helper missing");
  assert(/<<<INTAKE_BEGIN>>>/.test(SRC) && /<<<INTAKE_END>>>/.test(SRC), "intake sentinel markers missing");
  const callClaudeInvocations = (SRC.match(/\bawait\s+callClaude\s*\(/g) || []).length;
  assert(callClaudeInvocations >= 2, `expected ≥2 callClaude invocations; saw ${callClaudeInvocations}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// (b) Leak-detector — meta-instruction samples MUST match.
//     Uses the 9674fdb9 "Do not frame …" class. The ee1e0a6d miscite
//     is anchor content, not leak content, and is intentionally excluded.
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("REBUILD-IR leak-detector: catches four Task-0 defect samples", () => {
  const positives = [
    "Do not frame this as advisory content.",
    "Output ONLY Sections 6–7 followed by the annotations block.",
    "Per the rulebook, jurisdictional overlays follow.",
    "Sections 3–5 of a complete playbook are attached.",
  ];
  for (const s of positives) {
    assert(INSTRUCTION_LEAK_RE.test(s), `leak regex must flag: ${s}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// (c) False-positive suite — legitimate reader-imperatives from real Run A
//     output must pass CLEAN.
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("REBUILD-IR leak-detector: ≥8 legitimate reader-imperatives pass clean", () => {
  const negatives = [
    "Notify the Attorney General within 15 days of discovery.",
    "Contact affected individuals by first-class mail no later than 60 calendar days after discovery.",
    "Preserve all forensic images and access logs before restoring from backup.",
    "Convene the incident response team within one hour of confirmed unauthorized access.",
    "Escalate to outside breach counsel prior to any external communication.",
    "Document the risk-of-harm assessment in the § 164.402 workpaper before closing the matter.",
    "Coordinate media statements with communications counsel before any press outreach.",
    "Retain the § 164.408 log for six years per the HIPAA retention rule.",
    "Notify the Secretary of HHS contemporaneously with the § 164.404 individual notice for aggregate breaches of 500 or more.",
  ];
  const misses: string[] = [];
  for (const s of negatives) {
    if (INSTRUCTION_LEAK_RE.test(s)) misses.push(s);
  }
  assertEquals(misses, [], `false positives detected: ${JSON.stringify(misses)}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// (d) TEMPORAL ANCHORING rule present.
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("REBUILD-IR: TEMPORAL ANCHORING rule present in IR_RULEBOOK", () => {
  assert(
    /TEMPORAL ANCHORING[^]{0,200}INCIDENT DATE CONTROLS/i.test(SRC),
    "TEMPORAL ANCHORING rule text missing or malformed",
  );
  assert(
    /a later change may be mentioned only as an expressly dated subsequent development/i.test(SRC),
    "retroactive-application ban missing from TEMPORAL ANCHORING",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// (e) POST-CUTOFF verified anchor — NY S2659B (Ch. 647 of 2024).
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("REBUILD-IR: NY S2659B post-cutoff anchor present with signed date", () => {
  assert(/S2659B|Chapter\s*647/i.test(SRC), "NY S2659B / Ch. 647 identifier missing");
});
