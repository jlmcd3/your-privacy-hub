// E8973164 (2026-08-28, quality batch, flagged HIGH) — a sentence citing a
// THIRD PARTY's own, already-obtained counsel opinion as the recorded basis
// for a fact ("financial KPIs alone do not satisfy their LP-level
// disclosure requirements per their legal counsel's written opinion dated
// 2026-03-12") tripped e6_counsel_referral on the literal phrase "legal
// counsel". This is a citation of a historical document, not a directive to
// the reader to go obtain counsel, and the counsel named is not even the
// assessed company's own. A new exemption (COUNSEL_SOURCE_CITATION_RE)
// recognises "per/under/according to/pursuant to <subject> <counsel type>
// counsel's <opinion/advice/memo/...>" as a source citation.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { _internals } from "../../../supabase/functions/_shared/grader/format-checks.ts";

const RHEINHOLD_SENTENCE =
  "Rheinhold Capital Partners' fund reporting obligations under their limited-partnership agreements require operational volume metrics, and financial KPIs alone do not satisfy their LP-level disclosure requirements per their legal counsel's written opinion dated 2026-03-12.";

Deno.test("E8973164 — a third party's own already-obtained counsel opinion, cited as a source, does not fail e6", () => {
  const findings = _internals.checkE6(RHEINHOLD_SENTENCE);
  const fails = findings.filter((f: { passed?: boolean }) => f.passed === false);
  assert(fails.length === 0, `must not flag a source citation as a counsel referral: ${JSON.stringify(findings)}`);
});

Deno.test("E8973164 — a genuine directive to consult counsel, even with 'per ... counsel's advice' nearby, still fails e6", () => {
  const directive =
    "Per its legal counsel's advice on similar matters, the company should consult external counsel before finalising this notice.";
  const findings = _internals.checkE6(directive);
  const fails = findings.filter((f: { passed?: boolean }) => f.passed === false);
  assert(fails.length > 0, "a genuine directive verb ('should consult external counsel') must still fail");
});

Deno.test("E8973164 — 'under its counsel's guidance' (another preposition, another noun) is also exempted", () => {
  const sentence =
    "The vendor's retention period was set at 90 days under its outside counsel's guidance following a 2025 regulatory inquiry.";
  const findings = _internals.checkE6(sentence);
  const fails = findings.filter((f: { passed?: boolean }) => f.passed === false);
  assert(fails.length === 0, `must recognise the source-citation shape: ${JSON.stringify(findings)}`);
});
